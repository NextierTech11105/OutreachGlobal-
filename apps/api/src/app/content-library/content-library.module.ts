import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { ContentCategoryResolver } from "./resolvers/content-category.resolver";
import { ContentItemResolver } from "./resolvers/content-item.resolver";
import { ContentCategoryService } from "./services/content-category.service";
import { ContentItemService } from "./services/content-item.service";
import { ContentCategoryRepository } from "./repositories/content-category.repository";
import { ContentItemRepository } from "./repositories/content-item.repository";
import { ContentLibraryRunner } from "./content-library.runner";

@CustomModule({
  imports: [TeamModule],
  resolvers: [ContentCategoryResolver, ContentItemResolver],
  providers: [ContentCategoryService, ContentItemService, ContentLibraryRunner],
  repositories: [ContentCategoryRepository, ContentItemRepository],
  exports: [ContentCategoryService, ContentItemService],
})
export class ContentLibraryModule {}
