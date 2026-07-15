import fs from "fs";
import path from "path";

describe("paper genealogy image import", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "CreatorPage.js"),
    "utf8",
  );

  it("starts secure upload and multimodal parsing immediately after selection", () => {
    expect(source).toContain("handlePhotoImport(list);");
    expect(source).toContain("tencentImageAnalysisService.parseFamilyTree");
    expect(source).toContain("setShowMobileTable(true)");
  });

  it("does not keep the old three-button upload and OCR workflow", () => {
    expect(source).not.toContain('>上传照片</Button>');
    expect(source).not.toContain('>识别照片</Button>');
    expect(source).not.toContain('>手动编辑</Button>');
    expect(source).not.toContain("tencentOcrService");
  });
});
