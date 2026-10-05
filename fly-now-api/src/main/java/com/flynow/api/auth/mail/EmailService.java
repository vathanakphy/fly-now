package com.flynow.api.auth.mail;

import com.flynow.api.auth.token.SecureTokenService.IssuedToken;
import com.flynow.api.entities.UserAccount;

public interface EmailService {

    void sendPasswordReset(UserAccount user, IssuedToken token);
}
