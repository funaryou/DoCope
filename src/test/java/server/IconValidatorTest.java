package server;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import server.exceptions.InvalidIconException;
import server.validation.IconValidator;

class IconValidatorTest {

    private IconValidator validator;

    @BeforeEach
    void setUp() {
        validator = new IconValidator(DataSize.ofMegabytes(5));
    }

    @Test
    void rejectsNull() {
        assertThrows(InvalidIconException.class, () -> validator.validate(null));
    }

    @Test
    void rejectsEmpty() {
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "empty.png", "image/png", new byte[0]);
        assertThrows(InvalidIconException.class, () -> validator.validate(file));
    }

    @Test
    void rejectsUnknownExtension() {
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "evil.exe", "application/octet-stream", new byte[] { 1 });
        assertThrows(InvalidIconException.class, () -> validator.validate(file));
    }

    @Test
    void rejectsOversize() {
        byte[] content = new byte[6 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "big.png", "image/png", content);
        assertThrows(InvalidIconException.class, () -> validator.validate(file));
    }

    @Test
    void acceptsPng() {
        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "logo.png", "image/png", new byte[] { 1, 2, 3 });
        assertDoesNotThrow(() -> validator.validate(file));
    }
}
