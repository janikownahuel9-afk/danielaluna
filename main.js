// Espera a que el contenido de la página se cargue
document.addEventListener("DOMContentLoaded", () => {
    
    const header = document.querySelector('.main-header');

    // Función para manejar el scroll
    const handleScroll = () => {
        // Si el usuario ha bajado más de 50px
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    // Escucha el evento 'scroll' en la ventana
    window.addEventListener('scroll', handleScroll);
});