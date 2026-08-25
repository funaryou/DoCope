package server.controllers;

import server.entities.DocumentItem;
import server.services.DocumentService;

import static server.views.Views.DETAIL;
import static server.views.Views.INDEX;
import static server.views.Views.REDIRECT_ROOT;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService service;

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("documents", service.findAll());
        model.addAttribute("documentItem", new DocumentItem());
        return INDEX;
    }

    @PostMapping("/register")
    public String register(
        @RequestParam String name,
        @RequestParam String path,
        @RequestParam(
            required = false
        ) String description
    ) {
        service.create(
            name,
            path,
            description
        );
        return REDIRECT_ROOT;
    }

    @GetMapping("/detail/{id}")
    public String detail(
        @PathVariable Long id,
        Model model
    ) {
        var opt = service.findById(id);
        if (opt.isEmpty()) {
            return REDIRECT_ROOT;
        }

        DocumentItem item = opt.get();
        String content = item.getPath();

        model.addAttribute("document", item);
        model.addAttribute("fileContent", content);
        return DETAIL;
    }
}
