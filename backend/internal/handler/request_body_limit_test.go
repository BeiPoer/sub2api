package handler

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/logger"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

type failingRequestBody struct {
	read bool
}

func (r *failingRequestBody) Read(p []byte) (int, error) {
	if !r.read {
		r.read = true
		return copy(p, "private request body"), nil
	}
	return 0, errors.New("upload interrupted")
}

func (r *failingRequestBody) Close() error { return nil }

func TestRequestBodyLimitTooLarge(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limit := int64(16)
	router := gin.New()
	router.Use(middleware.RequestBodyLimit(limit))
	router.POST("/test", func(c *gin.Context) {
		_, err := io.ReadAll(c.Request.Body)
		if err != nil {
			status, message := requestBodyReadFailure(nil, c.Request, err)
			c.JSON(status, gin.H{"error": message})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	payload := bytes.Repeat([]byte("a"), int(limit+1))
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewReader(payload))
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)
	require.Contains(t, recorder.Body.String(), buildBodyTooLargeMessage(limit))
}

func TestReadLenientJSONRequestBodyLogsReadFailureMetadata(t *testing.T) {
	core, logs := observer.New(zap.WarnLevel)
	req := httptest.NewRequest(http.MethodPost, "/v1/responses", nil)
	req.Body = &failingRequestBody{}
	req.ContentLength = 123
	req.Header.Set("Content-Encoding", "gzip")
	req.TransferEncoding = []string{"chunked"}
	req.Proto = "HTTP/2.0"
	req = req.WithContext(logger.IntoContext(req.Context(), zap.New(core)))

	_, err := readLenientJSONRequestBodyWithPrealloc(req, nil)
	require.EqualError(t, err, "upload interrupted")

	entries := logs.FilterMessage("read request body failed").All()
	require.Len(t, entries, 1)
	fields := entries[0].ContextMap()
	require.Equal(t, "upload interrupted", fields["error"])
	require.Equal(t, int64(123), fields["content_length"])
	require.Equal(t, "gzip", fields["content_encoding"])
	require.Equal(t, []any{"chunked"}, fields["transfer_encoding"])
	require.Equal(t, "HTTP/2.0", fields["protocol"])
	require.NotContains(t, fmt.Sprint(fields), "private request body")
}

func TestHandleRequestBodyReadErrorCancellation(t *testing.T) {
	for _, tc := range []struct {
		name      string
		cancelled bool
		committed bool
		readErr   error
		handled   bool
	}{
		{name: "cancelled", cancelled: true, handled: true},
		{name: "cancelled_after_commit", cancelled: true, committed: true, handled: true},
		{name: "ordinary_read_error"},
		// An HTTP/1 read deadline also cancels the request context; the
		// timeout must reach requestBodyReadFailure (408).
		{name: "read_timeout_with_cancelled_context", cancelled: true, readErr: &net.OpError{Op: "read", Net: "tcp", Err: os.ErrDeadlineExceeded}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			if tc.cancelled {
				cancel()
			}
			c.Request = httptest.NewRequest(http.MethodPost, "/v1/responses", nil).WithContext(ctx)
			if tc.committed {
				_, err := c.Writer.WriteString("already committed")
				require.NoError(t, err)
			}
			bodyBefore := recorder.Body.String()
			readErr := tc.readErr
			if readErr == nil {
				readErr = io.ErrUnexpectedEOF
			}
			require.Equal(t, tc.handled, handleRequestBodyReadError(c, nil, readErr))
			require.Equal(t, tc.handled, c.IsAborted())
			status := http.StatusOK
			if tc.handled && !tc.committed {
				status = statusClientClosedRequest
			}
			require.Equal(t, status, c.Writer.Status())
			require.Equal(t, bodyBefore, recorder.Body.String(), "cancelled clients must not receive an error body")
		})
	}
}
