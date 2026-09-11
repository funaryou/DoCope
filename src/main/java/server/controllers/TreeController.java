package server.controllers;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import server.infrastructure.fs.TreeNode;
import server.services.TreeService;

import java.io.IOException;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class TreeController {
    private final TreeService treeService;

    @GetMapping("/tree/{id}")
    @ResponseBody
    public List<TreeNode> tree(
        @PathVariable Long id,
        @RequestParam(
            value = "path",
            required = false
        ) String path
    ) throws IOException{
        return treeService.listChildren(id,path);
    }

    @GetMapping(value = "/content/{id}", produces = MediaType.TEXT_PLAIN_VALUE)
    @ResponseBody
    public String content(
        @PathVariable Long id,
        @RequestParam("path") String path
    ) throws IOException{
        return treeService.readText(id, path);
    }
    
    
    @GetMapping("/file/{id}")
    @ResponseBody
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
