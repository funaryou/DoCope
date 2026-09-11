package server.infrastructure.fs;

public record TreeNode(
    String name,
    String relativePath,
    boolean directory
) {}
