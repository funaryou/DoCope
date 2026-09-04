package server.dto;

import lombok.Getter;
import server.entities.DocumentItem;
import java.time.LocalDateTime;

@Getter
public class DocumentResponse {
    private final Long id;
    private final String name;
    private final String path;
    private final String description;
    private final String icon;
    private final String color;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public DocumentResponse(
        Long id,
        String name,
        String path,
        String description,
        String icon,
        String color,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {
        this.id = id;
        this.name = name;
        this.path = path;
        this.description = description;
        this.icon = icon;
        this.color = color;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static DocumentResponse from(
        DocumentItem item
    ) {
        return new DocumentResponse(
            item.getId(),
            item.getName(),
            item.getPath(),
            item.getDescription(),
            item.getIcon(),
            item.getColor(),
            item.getCreatedAt(),
            item.getUpdatedAt()
        );
    }
}