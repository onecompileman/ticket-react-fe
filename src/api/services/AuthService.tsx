import { httpClient } from "../httpClient";

class AuthService {
  
  getActiveUser(): Promise<any> {
    const path = '/auth/get-active-user';

    return httpClient.get(path, { withAuth: true });
  }

}

export const authService = new AuthService();
