package server.controllers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DirectoryController {
    public record DirectoryEntry(String name, String path) {}
    public record DirectoryResponse(String path, String parent, List<DirectoryEntry> directories) {}

    @GetMapping("/directories")
    public DirectoryResponse listDirectories(
        @RequestParam(value = "path", required = false) String path
    ) throws IOException {
        Path target;
        try {
            target = path == null || path.isBlank()
                ? Path.of("").toAbsolutePath().normalize()
                : Path.of(path).toAbsolutePath().normalize();
        } catch (InvalidPathException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "パスの形式が正しくありません");
        }
        if (!Files.isDirectory(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "フォルダが存在しません: " + target);
        }
        List<DirectoryEntry> directories;
        try (var stream = Files.list(target)) {
            directories = stream
                .filter(Files::isDirectory)
                .sorted(Comparator.comparing(p -> p.getFileName().toString().toLowerCase()))
                .map(p -> new DirectoryEntry(p.getFileName().toString(), p.toAbsolutePath().normalize().toString()))
                .toList();
        }
        Path parent = target.getParent();
        return new DirectoryResponse(target.toString(), parent == null ? null : parent.toString(), directories);
    }
}
