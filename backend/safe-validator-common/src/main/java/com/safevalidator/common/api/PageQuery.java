package com.safevalidator.common.api;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Pagination query parameters")
public record PageQuery(
        @Schema(description = "Page number (1-based)", example = "1") Integer pageNum,
        @Schema(description = "Page size", example = "20") Integer pageSize,
        @Schema(description = "Sort field") String sortBy,
        @Schema(description = "Sort direction (asc/desc)") String sortDir,
        @Schema(description = "Keyword filter") String keyword
) {
    public PageQuery {
        if (pageNum == null || pageNum < 1) pageNum = 1;
        if (pageSize == null || pageSize < 1) pageSize = 20;
        if (pageSize > 200) pageSize = 200;
        if (sortDir == null) sortDir = "desc";
    }
}