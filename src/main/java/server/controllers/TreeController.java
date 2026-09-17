package server.controllers;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import server.infrastructure.fs.TreeNode;
import server.services.TreeService;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class TreeController {
    private final TreeService treeService;

    @GetMapping("/tree/{id}")
    public List<TreeNode> tree(
        @PathVariable Long id,
        @RequestParam(value = "path", required = false) String path,
        @RequestParam(value = "showHidden", defaultValue = "false") boolean showHidden,
        @RequestParam(value = "showSystem", defaultValue = "false") boolean showSystem
    ) throws IOException{
        return treeService.listChildren(id, path, showHidden, showSystem);
    }

    @GetMapping(value = "/content/{id}", produces = MediaType.TEXT_PLAIN_VALUE)
    public String content(
        @PathVariable Long id,
        @RequestParam("path") String path
    ) throws IOException{
        return treeService.readText(id, path);
    }
    
    @GetMapping("/file/{id}")
    public ResponseEntity<byte[]> file(
        @PathVariable Long id,
        @RequestParam("path") String path
    ) throws IOException{
        TreeService.FileData data = treeService.readBytes(id, path);
        return ResponseEntity
            .ok()
            .contentType(MediaType.parseMediaType(data.contentType()))
            .body(data.body());
    }
}
