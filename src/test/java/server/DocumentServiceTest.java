package server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

import server.dto.DocumentCreateForm;
import server.dto.DocumentResponse;
import server.dto.DocumentUpdateForm;
import server.entities.DocumentItem;
import server.exceptions.DocumentNotFoundException;
import server.repositories.DocumentRepository;
import server.services.DocumentService;
import server.services.IconService;
import server.validation.IconValidator;

class DocumentServiceTest {

    private DocumentRepository repository;
    private IconService iconService;
    private IconValidator iconValidator;
    private DocumentService service;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(DocumentRepository.class);
        iconService = Mockito.mock(IconService.class);
        iconValidator = Mockito.mock(IconValidator.class);
        service = new DocumentService(repository, iconService, iconValidator);
    }

    private DocumentCreateForm createForm() {
        DocumentCreateForm form = new DocumentCreateForm();
        form.setName("テスト");
        form.setPath("/path/to/project");
        form.setDescription("テスト用");
        form.setColor("#fff1e6");
        return form;
    }

    private DocumentItem savedItem(Long id, String icon) {
        DocumentItem item = new DocumentItem();
        item.setName("テスト");
        item.setPath("/path/to/project");
        item.setDescription("テスト用");
        item.setIcon(icon);
        item.setColor("#fff1e6");
        return item;
    }

    @Test
    void createWithoutIcon() throws Exception {
        when(repository.save(any(DocumentItem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DocumentResponse created = service.create(createForm(), null);

        assertNull(created.getIcon());
        assertEquals("テスト", created.getName());
        verify(iconService, never()).save(any());
    }

    @Test
    void createWithIcon() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "logo.png", "image/png", new byte[] { 1, 2, 3 });
        when(iconService.save(file)).thenReturn("icons/abc.png");
        when(repository.save(any(DocumentItem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DocumentResponse created = service.create(createForm(), file);

        assertTrue(created.getIcon().startsWith("icons/"));
        verify(iconValidator).validate(file);
        verify(iconService).save(file);
    }

    @Test
    void createCompensatesFileOnDbFailure() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "logo.png", "image/png", new byte[] { 1, 2, 3 });
        when(iconService.save(file)).thenReturn("icons/abc.png");
        when(repository.save(any(DocumentItem.class)))
                .thenThrow(new RuntimeException("DB失敗"));

        assertThrows(RuntimeException.class, () -> service.create(createForm(), file));
        verify(iconService).deleteIfExists("icons/abc.png");
    }

    @Test
    void findAllMapsToResponse() {
        DocumentItem item = savedItem(1L, null);
        when(repository.findAll()).thenReturn(List.of(item));

        List<DocumentResponse> result = service.findAll();

        assertEquals(1, result.size());
        assertEquals("テスト", result.get(0).getName());
    }

    @Test
    void findByIdNotFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(DocumentNotFoundException.class, () -> service.findById(99L));
    }

    @Test
    void updateReplacesIconAndDeletesOld() throws Exception {
        DocumentItem existing = savedItem(1L, "icons/old.png");
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "new.png", "image/png", new byte[] { 1, 2, 3 });
        when(iconService.save(file)).thenReturn("icons/new.png");
        when(repository.save(any(DocumentItem.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DocumentUpdateForm form = new DocumentUpdateForm();
        DocumentResponse updated = service.update(1L, form, file);

        assertEquals("icons/new.png", updated.getIcon());
        verify(iconService).deleteIfExists("icons/old.png");
    }

    @Test
    void deleteRemovesFile() {
        DocumentItem existing = savedItem(1L, "icons/old.png");
        when(repository.findById(1L)).thenReturn(Optional.of(existing));

        service.delete(1L);

        verify(repository).delete(existing);
        verify(iconService).deleteIfExists("icons/old.png");
    }
}
