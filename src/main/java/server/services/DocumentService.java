package server.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import server.dto.DocumentCreateForm;
import server.dto.DocumentResponse;
import server.dto.DocumentUpdateForm;
import server.entities.DocumentItem;
import server.exceptions.DocumentNotFoundException;
import server.exceptions.InvalidDocumentPathException;
import server.repositories.DocumentRepository;
import server.validation.IconValidator;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {
    private final DocumentRepository repository;
    private final IconService iconService;
    private final IconValidator iconValidator;

    @Transactional
    public DocumentResponse create(
        DocumentCreateForm form,
        MultipartFile iconFile
    ) throws IOException {
        validateDirectory(form.getPath());
        String iconPath = null;
        if (iconFile != null && !iconFile.isEmpty()) {
            iconValidator.validate(iconFile);
            iconPath = iconService.save(iconFile);
        }
        try {
            DocumentItem item = new DocumentItem();
            item.setName(form.getName());
            item.setPath(form.getPath());
            item.setDescription(form.getDescription());
            item.setIcon(iconPath);
            item.setColor(form.getColor());
            return DocumentResponse.from(repository.save(item));
        } catch (RuntimeException e) {
            iconService.deleteIfExists(iconPath);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> findAll() {
        return repository
            .findAll()
            .stream()
            .map(DocumentResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public boolean isDirectoryAvailable(String path) {
        try {
            return path != null
                && !path.isBlank()
                && Files.isDirectory(Path.of(path).toAbsolutePath().normalize());
        } catch (InvalidPathException e) {
            return false;
        }
    }

    @Transactional(readOnly = true)
    public DocumentResponse findById(
        Long id
    ) {
        DocumentItem item = repository
            .findById(id)
            .orElseThrow(() -> new DocumentNotFoundException(id));
        return DocumentResponse.from(item);
    }

    @Transactional
    public DocumentResponse update(
        Long id,
        DocumentUpdateForm form,
        MultipartFile iconFile
    ) throws IOException {
        DocumentItem item = repository
            .findById(id)
            .orElseThrow(() -> new DocumentNotFoundException(id));
        
        if (form.getName() != null) item.setName(form.getName());
        if (form.getPath() != null) {
            validateDirectory(form.getPath());
            item.setPath(form.getPath());
        }
        if (form.getDescription() != null) item.setDescription(form.getDescription());
        if (form.getColor() != null) item.setColor(form.getColor());

        if (iconFile != null && !iconFile.isEmpty()) {
            iconValidator.validate(iconFile);
            String newPath = iconService.save(iconFile);
            String oldPath = item.getIcon();
            try {
                item.setIcon(newPath);
                DocumentResponse res = DocumentResponse.from(repository.save(item));
                iconService.deleteIfExists(oldPath);
                return res;
            } catch (RuntimeException e) {
                iconService.deleteIfExists(newPath);
                throw e;
            }
        }
        return DocumentResponse.from(repository.save(item));
    }

    private void validateDirectory(String path) {
        try {
            if (path == null || path.isBlank()
                || !Files.isDirectory(Path.of(path).toAbsolutePath().normalize())) {
                throw new InvalidDocumentPathException(path);
            }
        } catch (InvalidPathException e) {
            throw new InvalidDocumentPathException(path);
        }
    }

    @Transactional 
    public void delete(
        Long id
        ) {
        DocumentItem item = repository
            .findById(id)
            .orElseThrow(() -> new DocumentNotFoundException(id));
        
        repository.delete(item);
            
        if (item.getIcon() != null && !item.getIcon().isBlank()) {
            iconService.deleteIfExists(item.getIcon());
        }
    }
}
