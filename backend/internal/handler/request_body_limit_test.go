package handler

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
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
			if maxErr, ok := extractMaxBytesError(err); ok {
				c.JSON(http.StatusRequestEntityTooLarge, gin.H{
					"error": buildBodyTooLargeMessage(maxErr.Limit),
				})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "read_failed",
			})
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
