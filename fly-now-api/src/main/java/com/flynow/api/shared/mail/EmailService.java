package com.flynow.api.shared.mail;

import com.flynow.api.auth.service.SecureTokenService.IssuedToken;
import com.flynow.api.entities.UserAccount;

public interface EmailService {

    void sendPasswordReset(UserAccount user, IssuedToken token);
}
