package server.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import server.entities.DocumentItem;
import server.exceptions.DocumentNotFoundException;
import server.validation.FsSecurity;
import server.infrastructure.fs.TreeNode;
import server.repositories.DocumentRepository;

@Service
@RequiredArgsConstructor
public class TreeService {
    private final DocumentRepository repository;

    private DocumentItem findItem(
        Long projectId
    ) {
        return repository
            .findById(projectId)
            .orElseThrow(() -> new DocumentNotFoundException(projectId));
    }


    public List<TreeNode> listChildren(
        Long projectId,
        String relativePath
    ) throws IOException {
        DocumentItem item = findItem(projectId);
        Path root = Path.of(item.getPath());
        Path target = (relativePath == null || relativePath.isBlank())
            ? root
            : FsSecurity.resolve(root, relativePath);
        try(Stream<Path> stream = Files.list(target)) {
            return stream
                .sorted(Comparator.comparing(p -> p
                    .getFileName()
                    .toString()
                ))
                .map(
                    (p -> new TreeNode(
                        p.getFileName().toString(),
                        root.relativize(p).toString(),
                        Files.isDirectory(p)
                    ))
                )
                .toList();
        }
    }

    private Path resolveTarget(
        Long projectId,
        String relativePath
    ) {
        Path root = Path.of(findItem(projectId).getPath());
        Path target = FsSecurity.resolve(root, relativePath);
        if (Files.isDirectory(target)) {
            throw new IllegalArgumentException("フォルダは表示できません: " + relativePath);
        }
        return target;
    }

    public String readText(
        Long projectId,
        String relativePath
    ) throws IOException {
        return Files.readString(resolveTarget(projectId, relativePath));
    }

    public record FileData(
        byte[] body,
        String contentType
    ) {}

    public FileData readBytes(
        Long projectId,
        String relativePath
    ) throws IOException {
        Path target = resolveTarget(projectId, relativePath);
        return new FileData(Files.readAllBytes(target), Files.probeContentType(target));
    }
}
