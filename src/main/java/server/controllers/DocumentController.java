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
import server.exceptions.InvalidDocumentPathException;
import server.exceptions.InvalidIconException;
import server.services.DocumentService;

import java.io.IOException;
import java.util.List;

import static server.views.Views.REDIRECT_ROOT;
import static server.views.Views.WORKSPACE;

@Controller
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;

    private void populateWorkspace(
        Model model,
        DocumentResponse selected
    ) {
        List<DocumentResponse> documents = service.findAll();
        model.addAttribute("documents", documents);
        model.addAttribute("document", selected);
        model.addAttribute("projectId", selected != null ? selected.getId() : null);
        if (!model.containsAttribute("documentItem")) {
            model.addAttribute("documentItem", new DocumentCreateForm());
        }
    }

    @GetMapping("/")
    public String index(
        Model model
    ) {
        populateWorkspace(model, null);
        return WORKSPACE;
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
            populateWorkspace(model, null);
            return WORKSPACE;
        }
        try {
            service.create(form, iconFile);
            return REDIRECT_ROOT;
        } catch (InvalidIconException e) {
            model.addAttribute("iconError", e.getMessage());
            populateWorkspace(model, null);
            return WORKSPACE;
        } catch (IOException e) {
            model.addAttribute("iconError", "アイコン保存に失敗しました");
            populateWorkspace(model, null);
            return WORKSPACE;
        } catch (InvalidDocumentPathException e) {
            model.addAttribute("pathError", e.getMessage());
            populateWorkspace(model, null);
            return WORKSPACE;
        }
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
            populateWorkspace(model, document);
            model.addAttribute("iconError", "入力内容を確認してください");
            return WORKSPACE;
        }
        try {
            service.update(id, form, iconFile);
        } catch (InvalidIconException e) {
            populateWorkspace(model, document);
            model.addAttribute("iconError", e.getMessage());
            return WORKSPACE;
        } catch (IOException e) {
            populateWorkspace(model, document);
            model.addAttribute("iconError", "アイコン保存に失敗しました");
            return WORKSPACE;
        } catch (InvalidDocumentPathException e) {
            populateWorkspace(model, document);
            model.addAttribute("pathError", e.getMessage());
            return WORKSPACE;
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
        populateWorkspace(model, document);
        return WORKSPACE;
    }

}
