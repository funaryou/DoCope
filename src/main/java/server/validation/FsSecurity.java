package server.validation;

import java.nio.file.Path;

public final class FsSecurity {
    private FsSecurity() {}

    public static Path resolve(
        Path root,
        String relativePath
    ) {
        Path target = root
            .resolve(relativePath)
            .normalize();
        if (!target.startsWith(root.normalize())) {
            throw new IllegalArgumentException("範囲外のパスです" + relativePath);
        }
        return target;
    }
}
