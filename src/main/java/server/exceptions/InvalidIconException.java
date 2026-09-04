package server.exceptions;

public class InvalidIconException extends RuntimeException {
    public InvalidIconException(
        String message
    ) {
        super(message);
    }
}
