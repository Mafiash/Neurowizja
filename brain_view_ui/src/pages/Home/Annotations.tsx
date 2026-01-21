import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, Modal, Upload, message, Tag, List, Collapse, Divider } from "antd";
import { UploadOutlined, BugOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { getAllAnnotations, bulkUploadAnnotations, deleteAnnotation, AnnotationExtendedDTO, BulkImportResponseDTO } from "../../services/api_files.ts";
import dayjs from "dayjs";
import { Box, Paper, IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export const Annotations: React.FC = () => {
  const [annotations, setAnnotations] = useState<AnnotationExtendedDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importResults, setImportResults] = useState<BulkImportResponseDTO | null>(null);
  const navigate = useNavigate();

  const fetchAnnotations = async () => {
    setLoading(true);
    try {
      const data = await getAllAnnotations();
      setAnnotations(data);
    } catch (err) {
      message.error("Nie udało się pobrać adnotacji");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnotations();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnotation(id);
      message.success("Adnotacja usunięta");
      fetchAnnotations();
    } catch (err) {
      message.error("Błąd podczas usuwania");
    }
  };

  const handleImport = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!Array.isArray(json)) {
          message.error("Importowany plik musi być tablicą JSON");
          return;
        }
        const res = await bulkUploadAnnotations(json);
        setImportResults(res);
        fetchAnnotations();
        if (res.failed === 0) {
          message.success(`Pomyślnie zaimportowano ${res.success} adnotacji`);
        } else {
          message.warning(`Zaimportowano ${res.success}, ale wystąpiło ${res.failed} błędów`);
        }
      } catch (err) {
        message.error("Niepoprawny format pliku JSON");
      }
    };
    reader.readAsText(file);
    return false; // Prevent auto upload
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "Skan (Plik)",
      dataIndex: "scan_filename",
      key: "scan_filename",
      render: (text: string) => (
        <Text copyable ellipsis={{ tooltip: text }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Autor",
      dataIndex: "author_name",
      key: "author_name",
    },
    {
      title: "Data",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: (a: any, b: any) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: "Płaszczyzna",
      dataIndex: "plane",
      key: "plane",
      render: (plane: string) => <Tag color="blue">{plane}</Tag>,
    },
    {
      title: "Warstwa",
      dataIndex: "slice_index",
      key: "slice_index",
    },
    {
      title: "Notatka",
      dataIndex: "note_text",
      key: "note_text",
      ellipsis: true,
      render: (text: string) => text || <Text type="secondary">brak</Text>,
    },
    {
      title: "Akcje",
      key: "actions",
      render: (_: any, record: AnnotationExtendedDTO) => (
        <Space size="middle">
          <Tooltip title="Zobacz skan">
            <IconButton size="small" onClick={() => navigate(`/home/scans?scan_id=${record.scan_id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Usuń">
            <IconButton size="small" color="error" onClick={() => handleDelete(record.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Box sx={{ p: 4, height: "100%", overflowY: "auto", bgcolor: "#f8fafc" }}>
      <Paper sx={{ p: 4, borderRadius: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <Box>
            <Title level={2} style={{ margin: 0 }}>
              Repozytorium Adnotacji
            </Title>
            <Text type="secondary">Zarządzaj i przeglądaj wszystkie zapisane analizy medyczne</Text>
          </Box>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => {
              setImportModalVisible(true);
              setImportResults(null);
            }}
            size="large"
            style={{ borderRadius: 8, height: 45 }}
          >
            Importuj Adnotacje
          </Button>
        </Box>

        <Table
          columns={columns}
          dataSource={annotations.map((a) => ({ ...a, key: a.id }))}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
          style={{ background: "#fff", borderRadius: 8 }}
        />
      </Paper>

      <Modal
        title="Importuj adnotacje z pliku JSON"
        visible={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setImportModalVisible(false)}>
            Zamknij
          </Button>,
        ]}
        width={700}
      >
        <Box sx={{ py: 2 }}>
          <Text block style={{ marginBottom: 16 }}>
            Wybierz plik JSON zawierający tablicę obiektów z danymi adnotacji. Format musi być zgodny z `AnnotationCreateDTO`.
          </Text>

          <Upload accept=".json" beforeUpload={handleImport} showUploadList={false}>
            <Button icon={<UploadOutlined />}>Wybierz plik JSON</Button>
          </Upload>

          {importResults && (
            <Box sx={{ mt: 4 }}>
              <Divider style={{ margin: "16px 0" }} />
              <Title level={4}>
                Wyniki Importu <BugOutlined />
              </Title>
              <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                <Text>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} /> Sukces: <b>{importResults.success}</b>
                </Text>
                <Text>
                  <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} /> Błąd: <b>{importResults.failed}</b>
                </Text>
                <Text>
                  Razem: <b>{importResults.total}</b>
                </Text>
              </Box>

              {importResults.errors.length > 0 && (
                <Collapse ghost>
                  <Panel header={<Text type="danger">Szczegóły błędów ({importResults.errors.length})</Text>} key="1">
                    <List
                      size="small"
                      dataSource={importResults.errors}
                      renderItem={(item) => (
                        <List.Item>
                          <Text type="danger" style={{ fontSize: "12px" }}>
                            • {item}
                          </Text>
                        </List.Item>
                      )}
                    />
                  </Panel>
                </Collapse>
              )}
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};
