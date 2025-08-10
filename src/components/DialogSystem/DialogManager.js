import { useState } from 'react';

export const useDialogManager = () => {
    const [currentDialog, setCurrentDialog] = useState(null);
    const [dialogIndex, setDialogIndex] = useState(0);
    const [showDialog, setShowDialog] = useState(false);
    const [formData, setFormData] = useState({});
    const [currentForm, setCurrentForm] = useState(null);

    // Функция для отправки данных о прослушанном диалоге на сервер
    const markDialogAsListened = async (jsonFilename) => {
        try {
            // Извлекаем только имя файла без пути
            const filename = jsonFilename.split('/').pop().split('\\').pop();
            console.log('Normalized filename:', filename);
            console.log("Связь с бд ест111ь");
            const token = localStorage.getItem('token');
            const response = await fetch('/api/listen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    player_id: JSON.parse(sessionStorage.getItem('user_profile')).email,
                    json_filename: filename
                })
            });
            console.log("Связь с бд есть3455654");

            if (!response.ok) {
                console.error('Ошибка при отметке диалога как прослушанного');
            }
        } catch (error) {
            console.error('Ошибка сети:', error);
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
            console.error('Ошибка загрузки диалога:', error);
        }
    };

    const handleAnswerSelect = async (answer) => {
        console.log('[Debug] Answer object:', answer); // <- Что здесь выводится?
        console.log('[Debug] "end" in answer:', 'end' in answer); // <- Есть ли ключ end?
        if (answer.end !== undefined) {
            console.log('[Debug] Dialog end triggered!');
            // При завершении диалога отмечаем его как прослушанный
            if (currentDialog?.filename) {
                await markDialogAsListened(currentDialog.filename);
                console.log("Связь с бд есть");
            }
            setShowDialog(false);
        } else if (answer.next !== undefined) {
            if (typeof answer.next === 'string' && answer.next.startsWith('form_')) {
                const nextNode = currentDialog.dialog.find(node => node.id === answer.next);
                console.log("Связь с бд есть, но того все ебал");
                if (nextNode && nextNode.type === 'form') {
                    setCurrentForm(nextNode);
                    return;
                }
            }

            const nextIndex = currentDialog.dialog.findIndex(node => node.id === answer.next);
            if (nextIndex !== -1) {
                setDialogIndex(nextIndex);
            } else {
                console.error('Диалоговый узел не найден:', answer.next);
                setShowDialog(false);
            }
        }
        else if (answer.next == answer.end){
            console.log("Маму того ебал");
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
                console.log('Отправленные данные:', formData);

                // Если это последний узел формы, отмечаем диалог как прослушанный
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