package com.flynow.api.application.service;

import com.flynow.api.application.dto.request.CreateApplicationRequest;
import com.flynow.api.application.dto.request.UpdateApplicationRequest;
import com.flynow.api.application.repository.ApplicationRepository;
import com.flynow.api.entities.Application;
import com.flynow.api.entities.ApplicationLifecycleState;
import com.flynow.api.entities.UserAccount;
import com.flynow.api.shared.exception.ConflictException;
import com.flynow.api.shared.exception.ResourceNotFoundException;
import com.flynow.api.user.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private UserAccountRepository userRepository;

    private ApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ApplicationService(applicationRepository, userRepository);
    }

    @Test
    void createsDraftApplicationForAuthenticatedUser() {
        UserAccount owner = UserAccount.builder().id(7L).build();
        when(applicationRepository.existsByOwner_IdAndSlugAndDeletedAtIsNull(7L, "payment-api"))
                .thenReturn(false);
        when(userRepository.findById(7L)).thenReturn(Optional.of(owner));
        when(applicationRepository.saveAndFlush(any(Application.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Application result = service.create(7L,
                new CreateApplicationRequest(" Payment API ", "payment-api", " Handles payments "));

        ArgumentCaptor<Application> captor = ArgumentCaptor.forClass(Application.class);
        verify(applicationRepository).saveAndFlush(captor.capture());
        Application saved = captor.getValue();
        assertThat(saved.getOwner()).isSameAs(owner);
        assertThat(saved.getName()).isEqualTo("Payment API");
        assertThat(saved.getDescription()).isEqualTo("Handles payments");
        assertThat(saved.getLifecycleState()).isEqualTo(ApplicationLifecycleState.DRAFT);
        assertThat(result.getLifecycleState()).isEqualTo(ApplicationLifecycleState.DRAFT);
    }

    @Test
    void rejectsDuplicateActiveSlug() {
        when(applicationRepository.existsByOwner_IdAndSlugAndDeletedAtIsNull(7L, "payment-api"))
                .thenReturn(true);

        assertThatThrownBy(() -> service.create(7L,
                new CreateApplicationRequest("Payment API", "payment-api", null)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("An application with this slug already exists");

        verify(userRepository, never()).findById(any());
        verify(applicationRepository, never()).saveAndFlush(any());
    }

    @Test
    void doesNotReturnAnApplicationOutsideTheOwnerScopedQuery() {
        UUID applicationId = UUID.randomUUID();
        when(applicationRepository.findByIdAndOwner_IdAndDeletedAtIsNull(applicationId, 7L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(7L, applicationId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Application was not found");
    }

    @Test
    void updatesMetadataWithoutChangingOwnerOrLifecycleState() {
        UUID applicationId = UUID.randomUUID();
        UserAccount owner = UserAccount.builder().id(7L).build();
        Application application = Application.builder()
                .id(applicationId)
                .owner(owner)
                .name("Old name")
                .slug("old-name")
                .lifecycleState(ApplicationLifecycleState.CONFIGURING)
                .build();
        when(applicationRepository.findByIdAndOwner_IdAndDeletedAtIsNull(applicationId, 7L))
                .thenReturn(Optional.of(application));
        when(applicationRepository.existsByOwner_IdAndSlugAndIdNotAndDeletedAtIsNull(
                7L, "new-name", applicationId)).thenReturn(false);
        when(applicationRepository.saveAndFlush(application)).thenReturn(application);

        service.update(7L, applicationId,
                new UpdateApplicationRequest("New name", "new-name", "New description"));

        assertThat(application.getOwner()).isSameAs(owner);
        assertThat(application.getLifecycleState()).isEqualTo(ApplicationLifecycleState.CONFIGURING);
        assertThat(application.getName()).isEqualTo("New name");
        assertThat(application.getSlug()).isEqualTo("new-name");
    }

    @Test
    void softDeletesOwnedApplication() {
        UUID applicationId = UUID.randomUUID();
        Application application = Application.builder()
                .id(applicationId)
                .owner(UserAccount.builder().id(7L).build())
                .name("Payment API")
                .slug("payment-api")
                .lifecycleState(ApplicationLifecycleState.DRAFT)
                .build();
        when(applicationRepository.findByIdAndOwner_IdAndDeletedAtIsNull(applicationId, 7L))
                .thenReturn(Optional.of(application));

        service.delete(7L, applicationId);

        assertThat(application.getDeletedAt()).isNotNull();
        verify(applicationRepository, never()).delete(any());
    }
}
