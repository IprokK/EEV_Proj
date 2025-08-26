import { useState } from 'react';

export const useDialogManager = () => {
    const [currentDialog, setCurrentDialog] = useState(null);
    const [dialogIndex, setDialogIndex] = useState(0);
    const [showDialog, setShowDialog] = useState(false);
    const [formData, setFormData] = useState({});
    const [currentForm, setCurrentForm] = useState(null);

    // ������� ��� �������� ������ � ������������ ������� �� ������
    const markDialogAsListened = async (jsonFilename) => {
        try {
            // ��������� ������ ��� ����� ��� ����
            const filename = jsonFilename.split('/').pop().split('\\').pop();
            console.log('Normalized filename:', filename);
            console.log("����� � �� ���111�");
            const token = localStorage.getItem('token');
            const response = await fetch('/api/listen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    // player_id больше не обязателен: сервер возьмёт его из токена/сессии при наличии
                    json_filename: filename
                })
            });
            console.log("����� � �� ����3455654");

            if (!response.ok) {
                const txt = await response.text().catch(()=> '');
                console.error('Ошибка при записи прослушанного:', response.status, txt);
            }
        } catch (error) {
            console.error('Ошибка сети при записи прослушанного:', error);
        }
    };

    const loadDialog = async (npcId) => {
        try {
            const response = await fetch(`/dialogs/${npcId}.json`);
            const data = await response.json();
            setCurrentDialog(data);
            setDialogIndex(0);
            setShowDialog(true);
        } catch (error) {
            console.error('������ �������� �������:', error);
        }
    };

    const handleAnswerSelect = async (answer) => {
        console.log('[Debug] Answer object:', answer); // <- ��� ����� ���������?
        console.log('[Debug] "end" in answer:', 'end' in answer); // <- ���� �� ���� end?
        if (answer.end !== undefined) {
            console.log('[Debug] Dialog end triggered!');
            // ��� ���������� ������� �������� ��� ��� ������������
            if (currentDialog?.filename) {
                await markDialogAsListened(currentDialog.filename);
                console.log("����� � �� ����");
            }
            setShowDialog(false);
        } else if (answer.next !== undefined) {
            if (typeof answer.next === 'string' && answer.next.startsWith('form_')) {
                const nextNode = currentDialog.dialog.find(node => node.id === answer.next);
                console.log("����� � �� ����, �� ���� ��� ����");
                if (nextNode && nextNode.type === 'form') {
                    setCurrentForm(nextNode);
                    return;
                }
            }

            const nextIndex = currentDialog.dialog.findIndex(node => node.id === answer.next);
            if (nextIndex !== -1) {
                setDialogIndex(nextIndex);
            } else {
                console.error('���������� ���� �� ������:', answer.next);
                setShowDialog(false);
            }
        }
        else if (answer.next == answer.end) {
            console.log("���� ���� ����");
        }
        else {
            setShowDialog(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (currentForm.next) {
            const nextIndex = currentDialog.dialog.findIndex(node => node.id === currentForm.next);
            if (nextIndex !== -1) {
                setDialogIndex(nextIndex);
                setCurrentForm(null);
                console.log('������������ ������:', formData);

                // ���� ��� ��������� ���� �����, �������� ������ ��� ������������
                const nextNode = currentDialog.dialog[nextIndex];
                if (nextNode.end && currentDialog?.filename) {
                    await markDialogAsListened(currentDialog.filename);
                }
            }
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return {
        currentDialog,
        dialogIndex,
        showDialog,
        formData,
        currentForm,
        loadDialog,
        handleAnswerSelect,
        handleFormSubmit,
        handleFormChange,
        setShowDialog
    };
};