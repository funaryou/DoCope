package server.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DocumentUpdateForm {
    @Size(
        max = 100,
        message = "プロジェクト名は100文字以内で入力してください"
    )
    private String name;

    @Size(
        max = 512,
        message = "パスは512文字以内で入力してください"
    )
    private String path;

    @Size(
        max = 200,
        message = "説明は200文字以内で入力してください"
    )
    private String description;

    @Size(
        max = 7,
        message = "カラーコードは７文字以内で入力してください"
    )
    private String color;
}
