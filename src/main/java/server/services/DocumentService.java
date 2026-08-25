package server.services;

import server.entities.DocumentItem;
import server.repositories.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;


@Service
@RequiredArgsConstructor
public class DocumentService {
    private final DocumentRepository repository;

    public DocumentItem create(
        String name,
        String path,
        String description
    ) {
        DocumentItem document = new DocumentItem();
        document.setName(name);
        document.setPath(path);
        document.setDescription(description);
        return repository.save(document);
    }

    public Optional<DocumentItem> findById(
        Long id
    ) {
        return repository.findById(id);
    }

    public List<DocumentItem> findAll(){
        return repository.findAll();
    }

    public DocumentItem updateDocumentItem(
        long id,
        String name,
        String path,
        String description
    ) {
        DocumentItem document = repository.findById(id)
            .orElseThrow(() 
                -> new RuntimeException(
                    "ドキュメントが見つかりません: " + id
                )
            );
        if (name != null){
            document.setName(name);
        }
        if (path != null){
            document.setPath(path);
        }
        if (description != null){
            document.setDescription(description);
        }
        return repository.save(document);
    }

    public void delete(
        Long id
        ) {
        repository.deleteById(id);
    }

}