package server.exceptions;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;

@ControllerAdvice(annotations = Controller.class)
@Slf4j
public class MvcExceptionHandler {
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
}
