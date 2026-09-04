package server.exceptions;

public class DocumentNotFoundException extends RuntimeException {
    public DocumentNotFoundException(
        Long id
    ) {
        super("ドキュメントが見つかりません: id=" + id);
    }
}
