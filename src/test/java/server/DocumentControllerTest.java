package server;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import server.controllers.DocumentController;
import server.dto.DocumentResponse;
import server.exceptions.InvalidIconException;
import server.services.DocumentService;

class DocumentControllerTest {

    private MockMvc mvc;
    private DocumentService service;

    @BeforeEach
    void setUp() {
        service = Mockito.mock(DocumentService.class);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders
                .standaloneSetup(new DocumentController(service))
                .setValidator(validator)
                .build();
    }

    @Test
    void indexReturns200() throws Exception {
        when(service.findAll()).thenReturn(List.of());

        mvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("workspace"))
                .andExpect(model().attributeExists("documents", "documentItem"));
    }

    @Test
    void workspaceReturns200WithSelected() throws Exception {
        DocumentResponse response = new DocumentResponse(
                1L, "テスト", "/path", "説明", null, "#fff1e6",
                LocalDateTime.now(), LocalDateTime.now());
        when(service.findAll()).thenReturn(List.of(response));
        when(service.findById(1L)).thenReturn(response);

        mvc.perform(get("/workspace/1"))
                .andExpect(status().isOk())
                .andExpect(view().name("workspace"))
                .andExpect(model().attributeExists("documents", "document", "projectId", "documentItem"));
    }

    @Test
    void registerWithoutIconRedirects() throws Exception {
        DocumentResponse response = new DocumentResponse(
                1L, "テスト", "/path", "説明", null, "#fff1e6",
                LocalDateTime.now(), LocalDateTime.now());
        when(service.create(any(), any())).thenReturn(response);

        MockMultipartFile empty = new MockMultipartFile(
                "iconFile", "", "application/octet-stream", new byte[0]);

        mvc.perform(multipart("/register")
                        .file(empty)
                        .param("name", "テスト")
                        .param("path", "/path"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void registerWithInvalidIconShowsError() throws Exception {
        when(service.create(any(), any()))
                .thenThrow(new InvalidIconException("対応拡張子外です"));
        when(service.findAll()).thenReturn(List.of());

        MockMultipartFile file = new MockMultipartFile(
                "iconFile", "evil.exe", "application/octet-stream", new byte[] { 1 });

        mvc.perform(multipart("/register")
                        .file(file)
                        .param("name", "テスト")
                        .param("path", "/path"))
                .andExpect(status().isOk())
                .andExpect(view().name("workspace"))
                .andExpect(model().attributeExists("iconError"));
    }
}
