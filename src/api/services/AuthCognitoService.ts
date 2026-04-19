type CognitoTokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
};

class AuthCognitoService {
  private readonly domain = import.meta.env.VITE_COGNITO_DOMAIN;
  private readonly clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
  private readonly redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI;

  private get normalizedDomain(): string {
    return this.domain.replace(/\/+$/, '');
  }

  private get postLogoutRedirectUri(): string {
    return this.redirectUri || window.location.origin;
  }

  async getLoginToken(code: string): Promise<CognitoTokenResponse> {
    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
    });

    const response = await fetch(`${this.domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    return response.json() as Promise<CognitoTokenResponse>;
  }

  loginViaGoogle() {
    const url = `${this.normalizedDomain}/oauth2/authorize?identity_provider=Google&response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=openid+email+profile`;
    console.log("Redirecting to Cognito for Google login:", url);
    window.location.href = url;
  }
  
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('ticket_user');

    const params = new URLSearchParams({
      client_id: this.clientId,
      logout_uri: this.postLogoutRedirectUri,
    });
    
    console.log("Redirecting to Cognito for logout:", `${this.normalizedDomain}/logout?${params.toString()}`);

    window.location.href = `${this.normalizedDomain}/logout?${params.toString()}`;
  }

}

export const authCognitoService = new AuthCognitoService();
