package server.validation;

import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import server.exceptions.InvalidIconException;

@Component
public class IconValidator {
    private static final Set<String> ALLOWED = Set.of("png", "jpg", "jpeg", "webp", "gif", "ico");
    private final DataSize maxFileSize;

    public IconValidator(
        @Value("${spring.servlet.multipart.max-file-size:5MB}")
        DataSize maxFileSize
    ) {
        this.maxFileSize = maxFileSize;
    }

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidIconException("ファイルが空です");
        }
        if (file.getSize() > maxFileSize.toBytes()) {
            throw new InvalidIconException("ファイルサイズ上限（" + maxFileSize + "）超過です");
        }
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (ext == null || !ALLOWED.contains(ext.toLowerCase())) {
            throw new InvalidIconException("対応拡張子外です: " + ext);
        }
    }
}
