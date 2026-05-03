// ============ VARIABLES GLOBALES ============
let historial = [];
let usuario = {
    nombre: localStorage.getItem('usuario_nombre') || '',
    ingreso: parseFloat(localStorage.getItem('usuario_ingreso')) || 0
};
let widgets = JSON.parse(localStorage.getItem('widgets')) || [];

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    mostrarSeccion('dashboard');
    generarConsejosInicial();
    actualizarSelectCategoria();
});

// ============ GESTIÓN DE SIDEBAR Y NAVEGACIÓN ============
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function mostrarSeccion(id, btn) {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    
    document.querySelectorAll('.seccion').forEach(sec => {
        sec.classList.remove('active');
    });
    
    document.getElementById(id).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(navBtn => {
        navBtn.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    
    if (id === 'gastos') {
        actualizarLista();
    } else if (id === 'dashboard') {
        generarDashboard();
    }
}

// ============ USUARIO ============
function guardarUsuario() {
    const nombre = document.getElementById('nombre').value.trim();
    const ingreso = parseFloat(document.getElementById('ingreso').value);
    
    if (!nombre) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    usuario.nombre = nombre;
    usuario.ingreso = isNaN(ingreso) ? 0 : ingreso;
    
    localStorage.setItem('usuario_nombre', usuario.nombre);
    localStorage.setItem('usuario_ingreso', usuario.ingreso);
    
    mostrarInfoUsuario();
    alert('Perfil guardado exitosamente');
}

function mostrarInfoUsuario() {
    const info = document.getElementById('usuario-info');
    let contenido = '<strong>Perfil Actual:</strong><br>';
    contenido += `<p>👤 Nombre: <strong>${usuario.nombre || 'No definido'}</strong></p>`;
    contenido += `<p>💰 Ingreso Mensual: <strong>${usuario.ingreso ? usuario.ingreso + ' Bs' : 'No definido'}</strong></p>`;
    
    if (usuario.ingreso > 0) {
        const totalGastos = obtenerTotalGastos();
        const porcentajeGastado = (totalGastos / usuario.ingreso * 100).toFixed(1);
        const disponible = usuario.ingreso - totalGastos;
        
        contenido += `<p>📊 Total Gastado: <strong>${totalGastos} Bs (${porcentajeGastado}%)</strong></p>`;
        contenido += `<p>✅ Disponible: <strong>${disponible} Bs</strong></p>`;
    }
    
    info.innerHTML = contenido;
}

// ============ GESTIÓN DE GASTOS ============
function agregarGasto() {
    const categoria = document.getElementById('categoria').value.trim();
    const monto = parseFloat(document.getElementById('monto').value);
    
    if (!categoria || isNaN(monto) || monto <= 0) {
        alert('Por favor completa los campos correctamente');
        return;
    }
    
    const gasto = {
        id: Date.now(),
        categoria: categoria,
        monto: monto,
        fecha: new Date().toLocaleDateString('es-ES')
    };
    
    historial.push(gasto);
    guardarDatos();
    
    document.getElementById('categoria').value = '';
    document.getElementById('monto').value = '';
    
    actualizarLista();
    actualizarSelectCategoria();
    
    alert(`Gasto registrado: ${categoria} - ${monto} Bs`);
}

function actualizarLista() {
    const lista = document.getElementById('lista');
    lista.innerHTML = '';
    
    if (historial.length === 0) {
        lista.innerHTML = '<p style="color: #7F8C8D;">No hay gastos registrados</p>';
        return;
    }
    
    const gastosOrdenados = [...historial].sort((a, b) => b.id - a.id);
    
    gastosOrdenados.forEach(gasto => {
        const div = document.createElement('div');
        div.className = 'gasto-item';
        div.innerHTML = `
            <div class="gasto-info">
                <span class="gasto-categoria">${gasto.categoria}</span>
                <span class="gasto-monto">${gasto.monto} Bs</span>
                <small style="color: #7F8C8D;">${gasto.fecha}</small>
            </div>
            <button class="gasto-eliminar" onclick="eliminarGasto(${gasto.id})">Eliminar</button>
        `;
        lista.appendChild(div);
    });
}

function eliminarGasto(id) {
    if (confirm('¿Eliminar este gasto?')) {
        historial = historial.filter(g => g.id !== id);
        guardarDatos();
        actualizarLista();
        actualizarSelectCategoria();
    }
}

function obtenerTotalGastos() {
    return historial.reduce((total, gasto) => total + gasto.monto, 0);
}

// ============ ANÁLISIS ============
function analizar() {
    if (historial.length === 0) {
        document.getElementById('resultado').innerHTML = 
            '<div class="analisis-card"><p style="color: #7F8C8D;">No hay datos para analizar</p></div>';
        return;
    }
    
    const hashTable = {};
    let total = 0;
    
    historial.forEach(gasto => {
        hashTable[gasto.categoria] = (hashTable[gasto.categoria] || 0) + gasto.monto;
        total += gasto.monto;
    });
    
    const categorias = Object.entries(hashTable)
        .map(([categoria, monto]) => ({
            categoria,
            monto,
            porcentaje: (monto / total * 100).toFixed(1)
        }))
        .sort((a, b) => b.monto - a.monto);
    
    const categoriaMaxima = categorias[0];
    
    let html = `
        <div class="analisis-card">
            <div class="analisis-total">Total: ${total.toFixed(2)} Bs</div>
            <p style="color: #7F8C8D; margin-bottom: 20px;">Gastos agrupados por categoría</p>
    `;
    
    categorias.forEach(cat => {
        const isMax = cat.categoria === categoriaMaxima.categoria;
        html += `
            <div class="categoria-item" style="${isMax ? 'background: rgba(108, 99, 255, 0.05); padding: 12px; border-radius: 8px; margin: 5px 0;' : ''}">
                <div style="flex: 1;">
                    <div class="categoria-nombre">${isMax ? '🔥 ' : ''}${cat.categoria}${isMax ? ' (Mayor gasto)' : ''}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${cat.porcentaje}%"></div>
                    </div>
                </div>
                <div class="categoria-datos">
                    <span class="categoria-monto">${cat.monto.toFixed(2)} Bs</span>
                    <span class="categoria-porcentaje">${cat.porcentaje}%</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    document.getElementById('resultado').innerHTML = html;
}

// ============ OPTIMIZACIÓN ============
function optimizar() {
    const categoria = document.getElementById('objetivo').value.trim();
    const presupuesto = parseFloat(document.getElementById('presupuesto').value);
    
    if (!categoria || isNaN(presupuesto) || presupuesto <= 0) {
        alert('Por favor selecciona una categoría y un presupuesto válido');
        return;
    }
    
    if (historial.length === 0) {
        alert('No hay gastos registrados para optimizar');
        return;
    }
    
    const gastoActual = historial
        .filter(g => g.categoria === categoria)
        .reduce((total, g) => total + g.monto, 0);
    
    if (gastoActual === 0) {
        alert(`No hay gastos en la categoría: ${categoria}`);
        return;
    }
    
    const total = obtenerTotalGastos();
    const valorIdeal = presupuesto * 0.35;
    const diferencia = gastoActual - valorIdeal;
    const porcentajeDiferencia = (diferencia / valorIdeal * 100).toFixed(1);
    
    let nivel = 'Bajo';
    let color = '#1DD1A1';
    if (Math.abs(porcentajeDiferencia) > 50) {
        nivel = 'Alto';
        color = '#EE5A6F';
    } else if (Math.abs(porcentajeDiferencia) > 20) {
        nivel = 'Medio';
        color = '#FFA502';
    }
    
    let html = `
        <div class="analisis-card">
            <div style="border-bottom: 2px solid var(--border-color); padding-bottom: 15px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0;">📊 Optimización: ${categoria}</h3>
            </div>
            
            <div style="display: grid; gap: 15px;">
                <div style="background: rgba(108, 99, 255, 0.1); padding: 15px; border-radius: 8px;">
                    <p style="margin: 0 0 5px 0; color: #7F8C8D; font-size: 13px;">Gasto Actual</p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: var(--primary-color);">${gastoActual.toFixed(2)} Bs</p>
                </div>
                
                <div style="background: rgba(29, 209, 161, 0.1); padding: 15px; border-radius: 8px;">
                    <p style="margin: 0 0 5px 0; color: #7F8C8D; font-size: 13px;">Valor Ideal (35% de presupuesto)</p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: var(--success-color);">${valorIdeal.toFixed(2)} Bs</p>
                </div>
                
                <div style="background: rgba(255, 165, 2, 0.1); padding: 15px; border-radius: 8px;">
                    <p style="margin: 0 0 5px 0; color: #7F8C8D; font-size: 13px;">Diferencia</p>
                    <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${color};">
                        ${diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)} Bs (${porcentajeDiferencia}%)
                    </p>
                </div>
                
                <div style="background: ${color}20; padding: 15px; border-left: 4px solid ${color}; border-radius: 8px;">
                    <p style="margin: 0 0 5px 0; color: #7F8C8D; font-size: 13px;">Nivel de Enfoque</p>
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${color};">${nivel}</p>
                </div>
                
                <div style="background: var(--light-bg); padding: 15px; border-radius: 8px;">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                        ${diferencia > 0 
                            ? `⚠️ Estás gastando <strong>${Math.abs(diferencia.toFixed(2))} Bs más</strong> de lo ideal. Considera reducir gastos en esta categoría.`
                            : `✅ Estás gastando <strong>${Math.abs(diferencia.toFixed(2))} Bs menos</strong> de lo ideal. Buen control presupuestario.`
                        }
                    </p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('optResultado').innerHTML = html;
}

function actualizarSelectCategoria() {
    const select = document.getElementById('objetivo');
    const categoriasUnicas = [...new Set(historial.map(g => g.categoria))];
    
    select.innerHTML = '<option value="">-- Selecciona una categoría --</option>';
    categoriasUnicas.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// ============ CONSEJOS ============
function generarConsejos() {
    if (historial.length === 0) {
        document.getElementById('consejos-container').innerHTML = 
            '<p style="color: #7F8C8D;">Registra gastos para recibir consejos</p>';
        return;
    }
    
    const consejos = obtenerConsejos();
    renderizarConsejos(consejos);
}

function generarConsejosInicial() {
    const consejos = obtenerConsejos();
    if (consejos.length > 0) {
        renderizarConsejos(consejos);
    }
}

function obtenerConsejos() {
    const consejos = [];
    
    if (historial.length === 0) {
        consejos.push({
            titulo: '📝 Comienza a registrar',
            texto: 'Registra tus gastos para obtener análisis y recomendaciones personalizadas.',
            tipo: 'info'
        });
        return consejos;
    }
    
    const hashTable = {};
    let total = 0;
    
    historial.forEach(gasto => {
        hashTable[gasto.categoria] = (hashTable[gasto.categoria] || 0) + gasto.monto;
        total += gasto.monto;
    });
    
    for (let categoria in hashTable) {
        const monto = hashTable[categoria];
        const porcentaje = (monto / total * 100);
        
        if (porcentaje > 40) {
            consejos.push({
                titulo: `⚠️ ${categoria} muy alto`,
                texto: `Tu gasto en ${categoria} representa el ${porcentaje.toFixed(1)}% de tus gastos totales. Considera reducir este gasto para mejorar tu situación financiera.`,
                tipo: 'danger'
            });
        } else if (porcentaje < 10) {
            consejos.push({
                titulo: `💡 Invertir en ${categoria}`,
                texto: `Inviertes poco en ${categoria} (${porcentaje.toFixed(1)}%). Considera si necesitas aumentar la inversión en esta área.`,
                tipo: 'warning'
            });
        }
    }
    
    if (usuario.ingreso > 0) {
        const totalGastos = obtenerTotalGastos();
        const ahorro = usuario.ingreso - totalGastos;
        
        if (ahorro <= 0) {
            consejos.push({
                titulo: '💰 Sin ahorro',
                texto: 'No tienes ahorro disponible. Intenta reducir gastos para reservar dinero para emergencias o inversiones.',
                tipo: 'danger'
            });
        } else if (ahorro < usuario.ingreso * 0.1) {
            consejos.push({
                titulo: '🎯 Aumenta tu ahorro',
                texto: `Ahorras solo el ${(ahorro / usuario.ingreso * 100).toFixed(1)}% de tu ingreso. Intenta llegar al 20% para mayor estabilidad.`,
                tipo: 'warning'
            });
        } else {
            consejos.push({
                titulo: '✅ Excelente ahorro',
                texto: `Ahorras el ${(ahorro / usuario.ingreso * 100).toFixed(1)}% de tu ingreso. ¡Muy bien! Mantén esta disciplina.`,
                tipo: 'success'
            });
        }
    }
    
    return consejos;
}

function renderizarConsejos(consejos) {
    const container = document.getElementById('consejos-container');
    container.innerHTML = '';
    
    consejos.forEach(consejo => {
        const div = document.createElement('div');
        div.className = `consejo-item ${consejo.tipo}`;
        div.innerHTML = `
            <div class="consejo-title">${consejo.titulo}</div>
            <div class="consejo-text">${consejo.texto}</div>
        `;
        container.appendChild(div);
    });
}

// ============ DASHBOARD Y WIDGETS ============
function mostrarAddWidget() {
    document.getElementById('modal-widget').classList.add('active');
}

function cerrarModal() {
    document.getElementById('modal-widget').classList.remove('active');
}

function agregarWidgetDashboard(tipo) {
    const nuevoWidget = {
        id: Date.now(),
        tipo: tipo
    };
    
    widgets.push(nuevoWidget);
    guardarDatos();
    cerrarModal();
    generarDashboard();
}

function removerWidgetDashboard(id) {
    widgets = widgets.filter(w => w.id !== id);
    guardarDatos();
    generarDashboard();
}

function generarDashboard() {
    const container = document.getElementById('widgets-container');
    container.innerHTML = '';
    
    if (widgets.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--card-bg); border-radius: 12px; box-shadow: var(--shadow);">
                <p style="font-size: 18px; color: var(--text-secondary);">No hay widgets en el dashboard</p>
                <p style="color: #7F8C8D;">Haz clic en "+ Agregar Widget" para empezar</p>
            </div>
        `;
        return;
    }
    
    widgets.forEach(widget => {
        const div = document.createElement('div');
        div.className = 'widget';
        
        let contenido = '';
        
        switch(widget.tipo) {
            case 'resumen':
                contenido = generarWidgetResumen();
                break;
            case 'top-categoria':
                contenido = generarWidgetTopCategoria();
                break;
            case 'consejos-rapidos':
                contenido = generarWidgetConsejosRapidos();
                break;
            case 'progreso':
                contenido = generarWidgetProgreso();
                break;
            case 'grafico':
                contenido = generarWidgetGrafico();
                break;
        }
        
        div.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${contenido.titulo}</span>
                <button class="widget-remove" onclick="removerWidgetDashboard(${widget.id})">✕</button>
            </div>
            <div class="widget-content">
                ${contenido.html}
            </div>
        `;
        
        container.appendChild(div);
    });
}

function generarWidgetResumen() {
    const total = obtenerTotalGastos();
    const numGastos = historial.length;
    const promedio = numGastos > 0 ? (total / numGastos).toFixed(2) : 0;
    
    return {
        titulo: '📊 Resumen Total',
        html: `
            <div class="widget-value">${total.toFixed(2)} Bs</div>
            <div class="widget-description">Total en ${numGastos} gasto${numGastos !== 1 ? 's' : ''}</div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); color: #7F8C8D; font-size: 12px;">
                Promedio: ${promedio} Bs por gasto
            </div>
        `
    };
}

function generarWidgetTopCategoria() {
    if (historial.length === 0) {
        return {
            titulo: '🏆 Top Categoría',
            html: '<p style="color: #7F8C8D;">Sin datos</p>'
        };
    }
    
    const hashTable = {};
    historial.forEach(gasto => {
        hashTable[gasto.categoria] = (hashTable[gasto.categoria] || 0) + gasto.monto;
    });
    
    const topCategoria = Object.entries(hashTable).sort((a, b) => b[1] - a[1])[0];
    const total = obtenerTotalGastos();
    const porcentaje = (topCategoria[1] / total * 100).toFixed(1);
    
    return {
        titulo: '🏆 Top Categoría',
        html: `
            <div style="font-size: 16px; font-weight: 600; color: var(--primary-color);">${topCategoria[0]}</div>
            <div class="widget-value">${topCategoria[1].toFixed(2)} Bs</div>
            <div class="widget-description">${porcentaje}% del total</div>
        `
    };
}

function generarWidgetConsejosRapidos() {
    const consejos = obtenerConsejos();
    let html = '';
    
    if (consejos.length === 0) {
        html = '<p style="color: #7F8C8D;">Sin recomendaciones</p>';
    } else {
        html = consejos.slice(0, 2).map(c => `
            <div style="margin-bottom: 12px; padding: 8px; background: ${c.tipo === 'success' ? 'rgba(29, 209, 161, 0.1)' : 'rgba(255, 165, 2, 0.1)'}; border-radius: 6px;">
                <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">${c.titulo}</div>
                <div style="font-size: 11px; color: #7F8C8D; line-height: 1.4;">${c.texto.substring(0, 80)}...</div>
            </div>
        `).join('');
    }
    
    return {
        titulo: '💡 Consejos Rápidos',
        html: html
    };
}

function generarWidgetProgreso() {
    if (usuario.ingreso <= 0) {
        return {
            titulo: '⚡ Progreso',
            html: '<p style="color: #7F8C8D;">Define tu ingreso en el perfil</p>'
        };
    }
    
    const total = obtenerTotalGastos();
    const porcentaje = Math.min((total / usuario.ingreso * 100).toFixed(1), 100);
    const disponible = usuario.ingreso - total;
    
    return {
        titulo: '⚡ Progreso',
        html: `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>Gastado</span>
                    <span>${porcentaje}%</span>
                </div>
                <div class="progress-bar" style="height: 10px;">
                    <div class="progress-fill" style="width: ${porcentaje}%"></div>
                </div>
            </div>
            <div style="color: #7F8C8D; font-size: 12px;">
                <p style="margin: 8px 0;">💰 ${total.toFixed(2)} / ${usuario.ingreso} Bs</p>
                <p style="margin: 0; color: var(--success-color); font-weight: 600;">✓ Disponible: ${disponible.toFixed(2)} Bs</p>
            </div>
        `
    };
}

function generarWidgetGrafico() {
    if (historial.length === 0) {
        return {
            titulo: '📈 Gráfico',
            html: '<p style="color: #7F8C8D;">Sin datos para mostrar</p>'
        };
    }
    
    const hashTable = {};
    historial.forEach(gasto => {
        hashTable[gasto.categoria] = (hashTable[gasto.categoria] || 0) + gasto.monto;
    });
    
    const total = obtenerTotalGastos();
    const categorias = Object.entries(hashTable)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    let html = '<div style="font-size: 12px;">';
    categorias.forEach(([cat, monto]) => {
        const porcentaje = (monto / total * 100).toFixed(0);
        const ancho = porcentaje;
        html += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span style="font-weight: 500;">${cat}</span>
                    <span>${porcentaje}%</span>
                </div>
                <div style="height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${ancho}%; background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));"></div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    return {
        titulo: '📈 Gráfico',
        html: html
    };
}

// ============ PERSISTENCIA DE DATOS ============
function guardarDatos() {
    localStorage.setItem('historial', JSON.stringify(historial));
    localStorage.setItem('widgets', JSON.stringify(widgets));
}

function cargarDatos() {
    const historialGuardado = localStorage.getItem('historial');
    const widgetsGuardados = localStorage.getItem('widgets');
    
    if (historialGuardado) {
        historial = JSON.parse(historialGuardado);
    }
    
    if (widgetsGuardados) {
        widgets = JSON.parse(widgetsGuardados);
    }
    
    document.getElementById('nombre').value = usuario.nombre;
    document.getElementById('ingreso').value = usuario.ingreso || '';
    
    mostrarInfoUsuario();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('modal-widget').classList.remove('active');
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }
});
