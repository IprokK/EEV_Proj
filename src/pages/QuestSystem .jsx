import React, { useState, useEffect } from 'react';

const QuestSystem = ({ onClose }) => {
    const [quests, setQuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedQuest, setSelectedQuest] = useState(null);
    const [activeTab, setActiveTab] = useState('available');

    // Загрузка квестов при монтировании компонента
    useEffect(() => {
        loadQuests();
    }, []);

    // Функция загрузки квестов с сервера
    const loadQuests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/quests/player-status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setQuests(data.quests || []);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка сервера');
            }
        } catch (err) {
            console.error('Ошибка загрузки квестов:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Функция начала квеста
    const startQuest = async (questId) => {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/quests/${questId}/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка начала квеста: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                await loadQuests();
            } else {
                throw new Error(data.error || 'Неизвестная ошибка сервера');
            }
        } catch (err) {
            console.error('Ошибка начала квеста:', err);
            alert(`Ошибка начала квеста: ${err.message}`);
        }
    };

    // Фильтрация квестов по статусу
    const filteredQuests = quests.filter(quest => {
        switch (activeTab) {
            case 'available':
                return quest.status === 'available' && quest.hasAccess;
            case 'in_progress':
                return quest.status === 'in_progress';
            case 'completed':
                return quest.status === 'completed';
            case 'locked':
                return quest.status === 'locked' || !quest.hasAccess;
            default:
                return true;
        }
    });

    // Стили компонента
    const styles = {
        container: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            maxWidth: '800px',
            maxHeight: '80vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #444',
            borderRadius: '12px',
            padding: '20px',
            zIndex: 10000,
            color: 'white',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #444',
            paddingBottom: '10px'
        },
        closeButton: {
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '5px 10px'
        },
        tabs: {
            display: 'flex',
            marginBottom: '20px',
            borderBottom: '1px solid #444'
        },
        tab: {
            padding: '10px 20px',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            color: '#aaa',
            borderBottom: '2px solid transparent',
            transition: 'all 0.3s'
        },
        activeTab: {
            color: 'white',
            borderBottom: '2px solid #4CAF50'
        },
        questList: {
            flex: 1,
            overflowY: 'auto',
            paddingRight: '10px'
        },
        questItem: {
            background: 'rgba(50, 50, 50, 0.7)',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '10px',
            border: '1px solid #444',
            cursor: 'pointer',
            transition: 'all 0.3s'
        },
        questHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
        },
        questTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            margin: 0
        },
        questStatus: {
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        statusAvailable: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        statusInProgress: {
            backgroundColor: '#2196F3',
            color: 'white'
        },
        statusCompleted: {
            backgroundColor: '#9C27B0',
            color: 'white'
        },
        statusLocked: {
            backgroundColor: '#757575',
            color: 'white'
        },
        questDescription: {
            margin: '10px 0',
            color: '#ccc',
            fontSize: '14px'
        },
        questActions: {
            display: 'flex',
            gap: '10px',
            marginTop: '10px'
        },
        button: {
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
        },
        startButton: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        viewButton: {
            backgroundColor: '#2196F3',
            color: 'white'
        },
        disabledButton: {
            backgroundColor: '#757575',
            color: '#aaa',
            cursor: 'not-allowed'
        },
        questDetail: {
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(40, 40, 40, 0.8)',
            borderRadius: '8px',
            border: '1px solid #444'
        },
        stepList: {
            marginTop: '15px'
        },
        stepItem: {
            padding: '10px',
            marginBottom: '5px',
            background: 'rgba(60, 60, 60, 0.6)',
            borderRadius: '4px',
            borderLeft: '3px solid #444'
        },
        currentStep: {
            borderLeft: '3px solid #4CAF50',
            background: 'rgba(76, 175, 80, 0.1)'
        },
        completedStep: {
            borderLeft: '3px solid #9C27B0',
            background: 'rgba(156, 39, 176, 0.1)'
        },
        loading: {
            textAlign: 'center',
            padding: '20px',
            color: '#aaa'
        },
        error: {
            textAlign: 'center',
            padding: '20px',
            color: '#f44336'
        }
    };

    // Функция для получения стиля статуса
    const getStatusStyle = (status) => {
        switch (status) {
            case 'available': return { ...styles.questStatus, ...styles.statusAvailable };
            case 'in_progress': return { ...styles.questStatus, ...styles.statusInProgress };
            case 'completed': return { ...styles.questStatus, ...styles.statusCompleted };
            case 'locked': return { ...styles.questStatus, ...styles.statusLocked };
            default: return styles.questStatus;
        }
    };

    // Функция для получения текста статуса
    const getStatusText = (status) => {
        switch (status) {
            case 'available': return 'Доступен';
            case 'in_progress': return 'В процессе';
            case 'completed': return 'Завершен';
            case 'locked': return 'Заблокирован';
            default: return status;
        }
    };

    return (
        <div style={styles.container}>
            {/* ЗДЕСЬ КНОПКА ЗАКРЫТИЯ - внутри header */}
            <div style={styles.header}>
                <h2 style={{ margin: 0 }}>Система квестов</h2>
                <button
                    style={styles.closeButton}
                    onClick={onClose}
                >
                    ✕
                </button>
            </div>

            <div style={styles.tabs}>
                <button
                    style={activeTab === 'available' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
                    onClick={() => setActiveTab('available')}
                >
                    Доступные
                </button>
                <button
                    style={activeTab === 'in_progress' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
                    onClick={() => setActiveTab('in_progress')}
                >
                    В процессе
                </button>
                <button
                    style={activeTab === 'completed' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
                    onClick={() => setActiveTab('completed')}
                >
                    Завершенные
                </button>
                <button
                    style={activeTab === 'locked' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
                    onClick={() => setActiveTab('locked')}
                >
                    Заблокированные
                </button>
            </div>

            <div style={styles.questList}>
                {loading ? (
                    <div style={styles.loading}>Загрузка квестов...</div>
                ) : error ? (
                    <div style={styles.error}>
                        <p>Ошибка загрузки квестов: {error}</p>
                        <button
                            style={{ ...styles.button, ...styles.viewButton }}
                            onClick={loadQuests}
                        >
                            Попробовать снова
                        </button>
                    </div>
                ) : filteredQuests.length === 0 ? (
                    <div style={styles.loading}>
                        {activeTab === 'available' && 'Нет доступных квестов'}
                        {activeTab === 'in_progress' && 'Нет активных квестов'}
                        {activeTab === 'completed' && 'Нет завершенных квестов'}
                        {activeTab === 'locked' && 'Нет заблокированных квестов'}
                    </div>
                ) : (
                    filteredQuests.map(quest => (
                        <div
                            key={quest.id}
                            style={styles.questItem}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(70, 70, 70, 0.7)';
                                e.currentTarget.style.borderColor = '#666';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = styles.questItem.background;
                                e.currentTarget.style.borderColor = styles.questItem.borderColor;
                            }}
                            onClick={() => setSelectedQuest(selectedQuest?.id === quest.id ? null : quest)}
                        >
                            <div style={styles.questHeader}>
                                <h3 style={styles.questTitle}>{quest.title}</h3>
                                <span style={getStatusStyle(quest.status)}>
                                    {getStatusText(quest.status)}
                                </span>
                            </div>

                            <p style={styles.questDescription}>{quest.description}</p>

                            {quest.currentStep && quest.status === 'in_progress' && (
                                <div style={{ margin: '10px 0', padding: '8px', background: 'rgba(33, 150, 243, 0.1)', borderRadius: '4px' }}>
                                    <strong>Текущий шаг:</strong> {quest.currentStep.title}
                                </div>
                            )}

                            <div style={styles.questActions}>
                                {quest.status === 'available' && quest.hasAccess && (
                                    <button
                                        style={{ ...styles.button, ...styles.startButton }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startQuest(quest.id);
                                        }}
                                    >
                                        Начать квест
                                    </button>
                                )}

                                {(quest.status === 'in_progress' || quest.status === 'completed') && (
                                    <button
                                        style={{ ...styles.button, ...styles.viewButton }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedQuest(selectedQuest?.id === quest.id ? null : quest);
                                        }}
                                    >
                                        {selectedQuest?.id === quest.id ? 'Скрыть детали' : 'Показать детали'}
                                    </button>
                                )}

                                {quest.status === 'locked' && (
                                    <button
                                        style={{ ...styles.button, ...styles.disabledButton }}
                                        disabled
                                    >
                                        Недоступно
                                    </button>
                                )}
                            </div>

                            {selectedQuest?.id === quest.id && (
                                <div style={styles.questDetail}>
                                    <h4>Шаги квеста:</h4>
                                    <div style={styles.stepList}>
                                        {quest.steps.map(step => {
                                            let stepStyle = styles.stepItem;
                                            if (step.id === quest.currentStep?.id) {
                                                stepStyle = { ...styles.stepItem, ...styles.currentStep };
                                            } else if (step.playerStatus === 'completed') {
                                                stepStyle = { ...styles.stepItem, ...styles.completedStep };
                                            }

                                            return (
                                                <div key={step.id} style={stepStyle}>
                                                    <div style={{ fontWeight: 'bold' }}>
                                                        Шаг {step.stepIndex + 1}: {step.title}
                                                        {step.isOptional && ' (Опциональный)'}
                                                    </div>
                                                    <div style={{ marginTop: '5px', fontSize: '14px' }}>
                                                        {step.description}
                                                    </div>
                                                    {step.playerStatus && (
                                                        <div style={{
                                                            fontSize: '12px',
                                                            marginTop: '5px',
                                                            color: step.playerStatus === 'completed' ? '#4CAF50' : '#2196F3'
                                                        }}>
                                                            Статус: {step.playerStatus === 'completed' ? 'Завершен' : 'В процессе'}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default QuestSystem;