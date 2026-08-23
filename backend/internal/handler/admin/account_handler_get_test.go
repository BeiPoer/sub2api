package admin

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestAccountHandlerGetByIDReturnsAPIKey(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	adminSvc := newStubAdminService()
	adminSvc.getAccountResult = &service.Account{
		ID:       42,
		Name:     "account",
		Platform: service.PlatformOpenAI,
		Type:     service.AccountTypeAPIKey,
		Status:   service.StatusActive,
		Credentials: map[string]any{
			"api_key":       "sk-secret",
			"refresh_token": "refresh-secret",
			"base_url":      "https://api.example.com",
		},
	}
	handler := NewAccountHandler(adminSvc, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)
	router.GET("/api/v1/admin/accounts/:id", handler.GetByID)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/accounts/42", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	var payload struct {
		Data struct {
			Credentials       map[string]any  `json:"credentials"`
			CredentialsStatus map[string]bool `json:"credentials_status"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "sk-secret", payload.Data.Credentials["api_key"])
	require.Equal(t, "https://api.example.com", payload.Data.Credentials["base_url"])
	require.NotContains(t, payload.Data.Credentials, "refresh_token")
	require.True(t, payload.Data.CredentialsStatus["has_api_key"])
	require.True(t, payload.Data.CredentialsStatus["has_refresh_token"])
}
