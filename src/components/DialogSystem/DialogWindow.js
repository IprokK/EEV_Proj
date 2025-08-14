import React from 'react';

export const DialogWindow = ({
    currentDialog,
    dialogIndex,
    showDialog,
    formData,
    currentForm,
    handleAnswerSelect,
    handleFormSubmit,
    handleFormChange,
    setShowDialog
}) => {
    if (!showDialog || !currentDialog) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 3000,
            minWidth: '300px',
            border: '2px solid #555',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                borderBottom: '1px solid #444',
                paddingBottom: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {currentDialog.avatar && (
                        <img
                            src={currentDialog.avatar}
                            alt={currentDialog.name}
                            style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                marginRight: '10px',
                                objectFit: 'cover'
                            }}
                        />
                    )}
                    <h3 style={{ margin: 0 }}>{currentDialog.name}</h3>
                </div>
                <button
                    onClick={() => setShowDialog(false)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '20px',
                        cursor: 'pointer'
                    }}
                >
                    X
                </button>
            </div>

            {currentForm ? (
                <form onSubmit={handleFormSubmit}>
                    <h4 style={{ marginTop: 0 }}>{currentForm.title}</h4>
                    {currentForm.fields.map((field, idx) => (
                        <div key={idx} style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                {field.label}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    name={field.name}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    onChange={handleFormChange}
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid #555',
                                        color: 'white'
                                    }}
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    name={field.name}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    onChange={handleFormChange}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid #555',
                                        color: 'white'
                                    }}
                                />
                            )}
                        </div>
                    ))}
                    <button
                        type="submit"
                        style={{
                            padding: '8px 16px',
                            background: '#3a5f8d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        {currentForm.submit_text || 'Отправить'}
                    </button>
                </form>
            ) : (
                <>
                    <p style={{ marginBottom: '20px', minHeight: '60px' }}>
                        {currentDialog.dialog[dialogIndex].text}
                    </p>
                    {currentDialog.dialog[dialogIndex].answers?.length > 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginBottom: '20px'
                        }}>
                            {currentDialog.dialog[dialogIndex].answers.map((answer, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswerSelect(answer)}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#3a5f8d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                >
                                    {answer.text}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowDialog(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#4a76a8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Закрыть
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};