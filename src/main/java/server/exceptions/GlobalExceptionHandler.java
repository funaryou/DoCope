package server.exceptions;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(DocumentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
        DocumentNotFoundException ex
    ) {
        log.warn(ex.getMessage());
        return ResponseEntity
            .status(404)
            .body(
                Map.of(
                    "error",
                    ex.getMessage()
                )
            );
    }

    @ExceptionHandler(InvalidIconException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidIcon(
        InvalidIconException ex
    ) {
        log.warn(ex.getMessage());
        return ResponseEntity
            .badRequest()
            .body(
                Map.of(
                    "error",
                    ex.getMessage()
                )
            );
    }
}
