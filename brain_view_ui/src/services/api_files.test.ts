import api from "./api";
import { uploadScan, getUserScans, getScanUrl, saveAnnotation, getScanAnnotations, addComment } from "./api_files";

jest.mock("./api");
const mockedApi = api as jest.Mocked<typeof api>;

describe("api_files services", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uploadScan sends correct FormData", async () => {
    const file = new File(["dummy content"], "test.nii", { type: "application/octet-stream" });
    const mockResponse = { data: { scan_id: 1, filename: "test.nii" } };
    mockedApi.post.mockResolvedValue(mockResponse);

    const result = await uploadScan(file, "MRI");

    expect(mockedApi.post).toHaveBeenCalledWith("/files/upload-scan/", expect.any(FormData), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    expect(result).toEqual(mockResponse.data);
  });

  test("getUserScans returns scan list", async () => {
    const mockResponse = { data: { scans: [{ scan_id: 1, filename: "scan1.nii" }] } };
    mockedApi.get.mockResolvedValue(mockResponse);

    const result = await getUserScans();

    expect(mockedApi.get).toHaveBeenCalledWith("/files/user-scans/");
    expect(result).toEqual(mockResponse.data);
  });

  test("getScanUrl returns SAS URL", async () => {
    const mockResponse = { data: { scan_id: 1, sas_url: "http://sas.url" } };
    mockedApi.get.mockResolvedValue(mockResponse);

    const result = await getScanUrl(1);

    expect(mockedApi.get).toHaveBeenCalledWith("/files/scan-url/1");
    expect(result).toEqual(mockResponse.data);
  });

  test("saveAnnotation sends JSON and screenshot", async () => {
    const annotationData = { scan_id: 1, slice: 10, plane: "axial", points: [[1, 2, 3]] };
    const screenshot = new Blob(["image data"], { type: "image/png" });
    const mockResponse = { data: { id: 100 } };
    mockedApi.post.mockResolvedValue(mockResponse);

    const result = await saveAnnotation(annotationData, screenshot);

    expect(mockedApi.post).toHaveBeenCalledWith("/files/annotations/", expect.any(FormData), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    expect(result).toEqual(mockResponse.data);
  });

  test("getScanAnnotations returns annotations list", async () => {
    const mockResponse = { data: [{ id: 100, scan_id: 1, note_text: "Test note" }] };
    mockedApi.get.mockResolvedValue(mockResponse);

    const result = await getScanAnnotations(1);

    expect(mockedApi.get).toHaveBeenCalledWith("/files/annotations/1");
    expect(result).toEqual(mockResponse.data);
  });

  test("addComment sends text and returns new comment", async () => {
    const mockResponse = { data: { id: 1, text: "New comment" } };
    mockedApi.post.mockResolvedValue(mockResponse);

    const result = await addComment(100, "Nice image!");

    expect(mockedApi.post).toHaveBeenCalledWith("/files/annotations/100/comments/", { text: "Nice image!" });
    expect(result).toEqual(mockResponse.data);
  });
});
