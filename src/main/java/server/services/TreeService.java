package server.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
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
        String relativePath,
        boolean showHidden,
        boolean showSystem
    ) throws IOException {
        DocumentItem item = findItem(projectId);
        Path root = Path.of(item.getPath());
        Path target = (relativePath == null || relativePath.isBlank())
            ? root
            : FsSecurity.resolve(root, relativePath);
        try(Stream<Path> stream = Files.list(target)) {
            return stream
                // VS Code-style tree order: directories first, then files;
                // keep alphabetical order within each group.
                .sorted(
                    Comparator
                        .comparing((Path p) -> !Files.isDirectory(p))
                        .thenComparing(p -> p.getFileName().toString(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(p -> p.getFileName().toString())
                )
                .filter(p -> isVisible(p.getFileName().toString(), showHidden, showSystem))
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

    private boolean isVisible(String name, boolean showHidden, boolean showSystem) {
        boolean systemEntry = ".git".equals(name) || ".DS_Store".equals(name);
        if (systemEntry) return showSystem;
        return showHidden || !name.startsWith(".");
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
        return new FileData(Files.readAllBytes(target), contentType(target));
    }

    private String contentType(Path target) throws IOException {
        String name = target.getFileName().toString().toLowerCase(Locale.ROOT);
        int dot = name.lastIndexOf('.');
        String ext = dot >= 0 ? name.substring(dot + 1) : "";
        String known = switch (ext) {
            case "svg" -> "image/svg+xml";
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "ico" -> "image/x-icon";
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "mov" -> "video/quicktime";
            case "mp3" -> "audio/mpeg";
            case "wav" -> "audio/wav";
            case "ogg" -> "audio/ogg";
            case "m4a" -> "audio/mp4";
            case "pdf" -> "application/pdf";
            default -> null;
        };
        if (known != null) return known;
        String detected = Files.probeContentType(target);
        return detected != null && !detected.isBlank()
            ? detected
            : "application/octet-stream";
    }
}
