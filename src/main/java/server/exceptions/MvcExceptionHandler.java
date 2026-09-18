package server.exceptions;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import jakarta.servlet.http.HttpServletRequest;

import server.dto.DocumentCreateForm;
import server.dto.DocumentResponse;
import server.services.DocumentService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice(annotations = Controller.class)
@Slf4j
@RequiredArgsConstructor
public class MvcExceptionHandler {
    private final DocumentService service;

    @Value("${spring.servlet.multipart.max-file-size:10MB}")
    private String maxFileSize;

    @ExceptionHandler(DocumentNotFoundException.class)
    public ModelAndView handleNotFound(
        DocumentNotFoundException ex
    ) {
        log.warn(ex.getMessage());
        ModelAndView mav = new ModelAndView("error");
        mav.addObject(
            "errorMessage",
            ex.getMessage()
        );
        mav.addObject("errorCode", 404);
        return mav;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ModelAndView handleUploadTooLarge(
        MaxUploadSizeExceededException ex,
        HttpServletRequest request
    ) {
        log.warn("Multipart upload exceeded the configured limit: {}", ex.getMessage());
        DocumentResponse selected = selectedDocument(request);
        List<DocumentResponse> documents = service.findAll();
        Map<Long, Boolean> pathAvailability = documents.stream()
            .collect(Collectors.toMap(DocumentResponse::getId,
                document -> service.isDirectoryAvailable(document.getPath())));

        ModelAndView mav = new ModelAndView("workspace");
        mav.addObject("documents", documents);
        mav.addObject("pathAvailability", pathAvailability);
        mav.addObject("document", selected);
        mav.addObject("projectId", selected != null ? selected.getId() : null);
        mav.addObject("documentItem", new DocumentCreateForm());
        mav.addObject("iconError", "画像サイズが上限（" + maxFileSize + "）を超えています。");
        mav.addObject(selected == null ? "registerValidationError" : "editValidationError", true);
        return mav;
    }

    private DocumentResponse selectedDocument(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String prefix = "/update/";
        if (!uri.startsWith(prefix)) return null;
        try {
            return service.findById(Long.valueOf(uri.substring(prefix.length())));
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
