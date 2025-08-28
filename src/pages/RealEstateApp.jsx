import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function RealEstateApp(){
    const [selectedAction, setSelectedAction] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [showNotification, setShowNotification] = useState(false);

    // Mock данные для недвижимости
    const mockData = {
        buy: [
            {
                id: 1,
                title: "2-комнатная квартира у метро Парнас",
                image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 58,
                price: 9500000,
                type: "продажа",
                description: "Просторная 2-комнатная квартира в новом доме. Евроремонт, панорамные окна, современная техника. Район развитой инфраструктурой.",
                floor: 5,
                totalFloors: 12,
                year: 2020,
                renovation: "евроремонт"
            },
            {
                id: 2,
                title: "Студия в ЖК Комфорт",
                image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 28,
                price: 5800000,
                type: "продажа",
                description: "Уютная студия с современным ремонтом. Отличное расположение в пешей доступности от метро.",
                floor: 3,
                totalFloors: 9,
                year: 2018,
                renovation: "дизайнерский ремонт"
            },
            {
                id: 3,
                title: "3-комнатная квартира на Васильевском острове",
                image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 85,
                price: 14500000,
                type: "продажа",
                description: "Просторная трёхкомнатная квартира с видом на Финский залив. Высокие потолки, авторский дизайн.",
                floor: 7,
                totalFloors: 10,
                year: 2015,
                renovation: "авторский дизайн"
            },
            {
                id: 4,
                title: "1-комнатная квартира у метро Московская",
                image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 42,
                price: 7200000,
                type: "продажа",
                description: "Светлая однокомнатная квартира в спальном районе. Балкон, современная кухня, санузел совмещенный.",
                floor: 2,
                totalFloors: 5,
                year: 2010,
                renovation: "стандартный ремонт"
            },
            {
                id: 5,
                title: "Апартаменты в центре города",
                image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 65,
                price: 18200000,
                type: "продажа",
                description: "Элитные апартаменты в историческом центре Санкт-Петербурга. Высокий уровень комфорта и безопасности.",
                floor: 4,
                totalFloors: 6,
                year: 2022,
                renovation: "премиум ремонт"
            }
        ],
        rent: [
            {
                id: 6,
                title: "2-комнатная квартира на сутки",
                image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 55,
                price: 35000,
                type: "аренда",
                description: "Уютная квартира для краткосрочной аренды. Вся необходимая техника, интернет, парковка.",
                floor: 3,
                totalFloors: 5,
                year: 2005,
                renovation: "косметический ремонт"
            },
            {
                id: 7,
                title: "Студия на длительный срок",
                image: "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 30,
                price: 25000,
                type: "аренда",
                description: "Компактная студия для комфортного проживания. Район с развитой инфраструктурой.",
                floor: 1,
                totalFloors: 4,
                year: 2012,
                renovation: "евроремонт"
            },
            {
                id: 8,
                title: "3-комнатная квартира для семьи",
                image: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 78,
                price: 55000,
                type: "аренда",
                description: "Просторная квартира для семейного проживания. Детская площадка во дворе, рядом школа и детский сад.",
                floor: 6,
                totalFloors: 9,
                year: 2017,
                renovation: "стандартный ремонт"
            },
            {
                id: 9,
                title: "Лофт в креативном пространстве",
                image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 45,
                price: 42000,
                type: "аренда",
                description: "Стильный лофт в модном районе. Идеально для творческих людей и молодых специалистов.",
                floor: 2,
                totalFloors: 3,
                year: 2019,
                renovation: "лофт стиль"
            },
            {
                id: 10,
                title: "1-комнатная квартира у метро",
                image: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                area: 38,
                price: 28000,
                type: "аренда",
                description: "Удобная однокомнатная квартира в шаговой доступности от метро. Все необходимое для комфортной жизни.",
                floor: 4,
                totalFloors: 8,
                year: 2014,
                renovation: "современный ремонт"
            }
        ]
    };

    const handleActionSelect = (action) => {
        setSelectedAction(action);
        setSelectedProperty(null);
    };

    const handlePropertySelect = (property) => {
        setSelectedProperty(property);
    };

    const handleBackToList = () => {
        setSelectedProperty(null);
    };

    const handleScheduleViewing = () => {
        setShowNotification(true);
        setTimeout(() => {
            setShowNotification(false);
        }, 3000);
    };

    const formatPrice = (price, type) => {
        return type === "аренда"
            ? `${price.toLocaleString('ru-RU')} ₽/мес`
            : `${price.toLocaleString('ru-RU')} ₽`;
    };

    // Стили
    const containerStyle = {
        maxWidth: '700px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
    };

    const headerStyle = {
        textAlign: 'center',
        marginBottom: '40px',
        color: '#333'
    };

    const actionButtonsStyle = {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '40px'
    };

    const actionButtonStyle = {
        padding: '20px 40px',
        fontSize: '18px',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#007bff',
        color: 'white',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    };

    const actionButtonHoverStyle = {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#0056b3'
    };

    const propertiesGridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
    };

    const propertyCardStyle = {
        border: '1px solid #ddd',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    };

    const propertyCardHoverStyle = {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)'
    };

    const propertyImageStyle = {
        width: '100%',
        height: '200px',
        objectFit: 'cover'
    };

    const propertyInfoStyle = {
        padding: '15px'
    };

    const propertyTitleStyle = {
        margin: '0 0 10px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#333'
    };

    const propertyDetailsStyle = {
        margin: '0',
        fontSize: '14px',
        color: '#666'
    };

    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    };

    const modalContentStyle = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
    };

    const modalImageStyle = {
        width: '100%',
        height: '300px',
        objectFit: 'cover',
        borderRadius: '10px',
        marginBottom: '20px'
    };

    const modalTitleStyle = {
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '15px',
        color: '#333'
    };

    const modalPriceStyle = {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#007bff',
        marginBottom: '15px'
    };

    const modalDescriptionStyle = {
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#555',
        marginBottom: '20px'
    };

    const modalDetailsStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        marginBottom: '20px'
    };

    const detailItemStyle = {
        fontSize: '14px',
        color: '#666'
    };

    const buttonStyle = {
        padding: '12px 24px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease'
    };

    const backButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#6c757d',
        marginRight: '10px'
    };

    const notificationStyle = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#28a745',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '5px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1001,
        transition: 'opacity 0.3s ease'
    };

    return (
        <div style={containerStyle}>
            <header style={headerStyle}>
                <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#2c3e50' }}>
                    Недвижимость в Санкт-Петербурге
                </h1>
                <p style={{ fontSize: '18px', color: '#7f8c8d' }}>
                    Лучшие предложения прямо сейчас
                </p>
            </header>

            {!selectedAction ? (
                <div style={actionButtonsStyle}>
                    <button
                        style={actionButtonStyle}
                        onClick={() => handleActionSelect('buy')}
                        onMouseOver={(e) => Object.assign(e.target.style, actionButtonHoverStyle)}
                        onMouseOut={(e) => Object.assign(e.target.style, actionButtonStyle)}
                    >
                        Купить жильё
                    </button>
                    <button
                        style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}
                        onClick={() => handleActionSelect('rent')}
                        onMouseOver={(e) => Object.assign(e.target.style, { ...actionButtonHoverStyle, backgroundColor: '#218838' })}
                        onMouseOut={(e) => Object.assign(e.target.style, { ...actionButtonStyle, backgroundColor: '#28a745' })}
                    >
                        Снять в аренду
                    </button>
                </div>
            ) : selectedProperty ? (
                <div style={modalOverlayStyle} onClick={handleBackToList}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedProperty.image}
                            alt={selectedProperty.title}
                            style={modalImageStyle}
                        />
                        <h2 style={modalTitleStyle}>{selectedProperty.title}</h2>
                        <div style={modalPriceStyle}>
                            {formatPrice(selectedProperty.price, selectedProperty.type)}
                        </div>
                        <p style={modalDescriptionStyle}>{selectedProperty.description}</p>
                        <div style={modalDetailsStyle}>
                            <span style={detailItemStyle}>Площадь: {selectedProperty.area} м²</span>
                            <span style={detailItemStyle}>Этаж: {selectedProperty.floor}/{selectedProperty.totalFloors}</span>
                            <span style={detailItemStyle}>Год постройки: {selectedProperty.year}</span>
                            <span style={detailItemStyle}>Ремонт: {selectedProperty.renovation}</span>
                            <span style={detailItemStyle}>Тип: {selectedProperty.type}</span>
                        </div>
                        <button style={buttonStyle} onClick={handleScheduleViewing}>
                            Записаться на показ
                        </button>
                        <button style={backButtonStyle} onClick={handleBackToList}>
                            Назад к списку
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <button
                            style={backButtonStyle}
                            onClick={() => setSelectedAction(null)}
                        >
                            ← Назад к выбору
                        </button>
                    </div>
                    <div style={propertiesGridStyle}>
                        {mockData[selectedAction].map(property => (
                            <div
                                key={property.id}
                                style={propertyCardStyle}
                                onClick={() => handlePropertySelect(property)}
                                onMouseOver={(e) => Object.assign(e.target.style, propertyCardHoverStyle)}
                                onMouseOut={(e) => Object.assign(e.target.style, propertyCardStyle)}
                            >
                                <img
                                    src={property.image}
                                    alt={property.title}
                                    style={propertyImageStyle}
                                />
                                <div style={propertyInfoStyle}>
                                    <h3 style={propertyTitleStyle}>{property.title}</h3>
                                    <p style={propertyDetailsStyle}>
                                        Площадь: {property.area} м² | {formatPrice(property.price, property.type)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showNotification && (
                <div style={notificationStyle}>
                    Вы успешно записаны на показ!
                </div>
            )}
        </div>
    );
};