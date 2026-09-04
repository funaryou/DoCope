package server.services;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service 
public class IconService {
    private final String iconsDir;

    public IconService(
        @Value("${app.icons-dir:data/icons}")
        String iconsDir
    ) {
        this.iconsDir = iconsDir;
    }

    public String save(
        MultipartFile file
    ) throws IOException {
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String name = UUID.randomUUID() + "." + ext.toLowerCase();
        Files.copy(file.getInputStream(), Path.of(iconsDir, name));
        return Path.of(iconsDir).getFileName() + "/" + name;
    }

    public void deleteIfExists(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;
        try {
            Path base = Path.of(iconsDir).toAbsolutePath().normalize();
            String fileName = Path.of(relativePath).getFileName().toString();
            Path target = base.resolve(fileName).normalize();
            if (!target.startsWith(base)) return;
            Files.deleteIfExists(target);
        }
        catch (IOException | IllegalArgumentException ignore) {
            // 呼び出し側でログ出力すること
        }
    }
}
