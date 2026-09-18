package server.exceptions;

public class InvalidDocumentPathException extends RuntimeException {
    public InvalidDocumentPathException(String path) {
        super("存在するフォルダのパスを指定してください: " + path);
    }
}
