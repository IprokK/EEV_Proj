import { useState } from 'react';

export const useDialogManager = () => {
    const [currentDialog, setCurrentDialog] = useState(null);
    const [dialogIndex, setDialogIndex] = useState(0);
    const [showDialog, setShowDialog] = useState(false);
    const [formData, setFormData] = useState({});
    const [currentForm, setCurrentForm] = useState(null);

    // ������� ��� �������� ������ � ������������ ������� �� ������
    const markDialogAsListened = async (npcId, dialogueKey) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/quests/mark-dialog-listened', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    npc_id: npcId,
                    dialogue_key: dialogueKey
                })
            });

            if (!response.ok) {
                const txt = await response.text().catch(() => '');
                console.error('Ошибка при записи прослушанного диалога:', response.status, txt);
            } else {
                console.log('Диалог успешно отмечен как прослушанный');
            }
        } catch (error) {
            console.error('Ошибка сети при записи прослушанного диалога:', error);
        }
    };

    const loadDialog = async (npcId) => {
        try {
            const response = await fetch(`/dialogs/${npcId}.json`);
            const data = await response.json();
            setCurrentDialog(data);
            setDialogIndex(0);
            setShowDialog(true);

            // Получаем dialogue_key из JSON или используем npcId как fallback
            const dialogueKey = data.dialogue_key || npcId;

            // Записываем начало прослушивания диалога
            await markDialogAsListened(npcId, dialogueKey);
        } catch (error) {
            console.error('Ошибка загрузки диалога:', error);
        }
    };

    const handleAnswerSelect = async (answer) => {
        console.log('[Debug] Answer object:', answer);

        if (answer.end !== undefined) {
            console.log('[Debug] Dialog end triggered!');

            // При завершении диалога записываем финальное взаимодействие
            if (currentDialog) {
                const npcId = currentDialog.npc_id;
                const dialogueKey = currentDialog.dialogue_key || currentDialog.filename?.replace('.json', '');
                if (npcId && dialogueKey) {
                    await markDialogAsListened(npcId, dialogueKey);
                }
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