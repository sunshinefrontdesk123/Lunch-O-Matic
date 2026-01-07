import React from 'react';
import '../../App.css'; // Inherit styles or move specific ones here

const DinerFrame = ({ children, title = "Lunch-O-Matic" }) => {
    return (
        <div className="diner-frame">
            <div className="diner-inner">
                <header className="diner-header">
                    <h1 className="diner-title">{title}</h1>
                    <div className="diner-subtitle">EST. 1955</div>
                </header>
                <main className="diner-content">
                    {children}
                </main>
            </div>
            {/* Decorative bolts/lights could go here */}
        </div>
    );
};

export default DinerFrame;
