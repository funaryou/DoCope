package server.controllers;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import server.dto.DocumentCreateForm;
import server.dto.DocumentResponse;
import server.dto.DocumentUpdateForm;
import server.exceptions.InvalidIconException;
import server.services.DocumentService;

import java.io.IOException;

import static server.views.Views.DETAIL;
import static server.views.Views.EDIT;
import static server.views.Views.INDEX;
import static server.views.Views.REDIRECT_ROOT;
import static server.views.Views.WORKSPACE;

@Controller
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;

    @GetMapping("/")
    public String index(
        Model model
    ) {
        model.addAttribute("documents", service.findAll());
        model.addAttribute("documentItem", new DocumentCreateForm());
        return INDEX;
    }

    @GetMapping("/detail/{id}")
    public String detail(
        @PathVariable 
        Long id,
        Model model
    ) {
        DocumentResponse document = service.findById(id);
        model.addAttribute("document",document);
        model.addAttribute("filePath",document.getPath());
        return DETAIL;
    }

    @PostMapping(
        value = "/register",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public String register(
        @Valid
        @ModelAttribute("documentItem")
        DocumentCreateForm form,
        BindingResult result,
        @RequestParam(
            value = "iconFile",
            required = false
        )
        MultipartFile iconFile,
        Model model
    ) {
        if (result.hasErrors()) {
            model.addAttribute("documents",service.findAll());
            return INDEX;
        }
        try {
            service.create(form, iconFile);
        } catch (InvalidIconException e) {
            model.addAttribute("documents", service.findAll());
            model.addAttribute("iconError", e.getMessage());
            return INDEX;
        } catch (IOException e) {
            model.addAttribute("documents", service.findAll());
            model.addAttribute("iconError", "アイコン保存に失敗しました");
            return INDEX;
        }
        return REDIRECT_ROOT;
    }

    @GetMapping("/edit/{id}")
    public String edit(
        @PathVariable
        Long id,
        Model model
    ) {
        DocumentResponse document = service.findById(id);
        DocumentUpdateForm form = new DocumentUpdateForm();
        form.setName(document.getName());
        form.setPath(document.getPath());
        form.setDescription(document.getDescription());
        form.setColor(document.getColor());
        model.addAttribute("document", document);
        model.addAttribute("form", form);
        return EDIT;
    }

    @PostMapping(
        value = "/update/{id}",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public String update(
        @PathVariable
        Long id,
        @Valid
        @ModelAttribute("form")
        DocumentUpdateForm form,
        BindingResult result,
        @RequestParam(
            value = "iconFile",
            required = false
        )
        MultipartFile iconFile,
        Model model
    ) {
        DocumentResponse document = service.findById(id);
        if (result.hasErrors()) {
            model.addAttribute("document", document);
            return EDIT;
        }
        try {
            service.update(id, form, iconFile);
        } catch (InvalidIconException e) {
            model.addAttribute("document", document);
            model.addAttribute("iconError", e.getMessage());
            return EDIT;
        } catch (IOException e) {
            model.addAttribute("document", document);
            model.addAttribute("iconError", "アイコン保存に失敗しました");
            return EDIT;
        }
        return REDIRECT_ROOT;
    }

    @PostMapping("/delete/{id}")
    public String delete(
        @PathVariable
        Long id
    ) {
        service.delete(id);
        return REDIRECT_ROOT;
    }

    @GetMapping("/workspace/{id}")
    public String workspace(
        @PathVariable
        Long id,
        Model model
    ) {
        DocumentResponse document = service.findById(id);
        model.addAttribute("document", document);
        model.addAttribute("projectId", document.getId());
        return WORKSPACE;
    }

}
