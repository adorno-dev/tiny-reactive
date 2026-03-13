#[cfg(feature = "wasm-bindgen")]
use wasm_bindgen::prelude::*;
#[cfg(feature = "wasm-bindgen")]
use serde::{Serialize, Deserialize};
#[cfg(feature = "wasm-bindgen")]
use serde_wasm_bindgen::Serializer;
#[cfg(feature = "wasm-bindgen")]
use wasm_bindgen_futures::spawn_local;

use std::str;
use std::sync::atomic::{AtomicU32, Ordering};

// ========== CONSTANTES ==========
const SAB_HEADER_SIZE: usize = 16;
const MAX_DATA_SIZE: usize = 1024;
const MAX_CONSOLES: usize = 100;
const MAX_STRING_LEN: usize = 64;
const MEMORY_SIZE: usize = 1024 * 1024; // 1MB

// A memória compartilhada (vem do JS) - MUTÁVEL!
extern "C" {
    static mut memory: *mut u8;
}

// ========== ESTRUTURA ÚNICA ==========
#[repr(C)]
#[derive(Copy, Clone)]
struct RawConsole {
    id: i32,
    name: [u8; MAX_STRING_LEN],
    manufacturer: [u8; MAX_STRING_LEN],
    year: i32,
    cpu: [u8; MAX_STRING_LEN],
    gpu: [u8; MAX_STRING_LEN],
    units_sold: i32,
}

// ========== DADOS ESTÁTICOS ==========
static mut CONSOLES: [RawConsole; MAX_CONSOLES] = [RawConsole {
    id: 0,
    name: [0; MAX_STRING_LEN],
    manufacturer: [0; MAX_STRING_LEN],
    year: 0,
    cpu: [0; MAX_STRING_LEN],
    gpu: [0; MAX_STRING_LEN],
    units_sold: -1,
}; MAX_CONSOLES];
static mut CONSOLES_COUNT: usize = 0;
static mut NEXT_ID: i32 = 1;

// ========== FUNÇÕES AUXILIARES ==========
unsafe fn str_to_bytes(s: &str, dest: &mut [u8]) {
    let bytes = s.as_bytes();
    let len = std::cmp::min(bytes.len(), MAX_STRING_LEN - 1);
    dest[..len].copy_from_slice(&bytes[..len]);
    dest[len] = 0;
}

unsafe fn bytes_to_str(src: &[u8]) -> &str {
    let len = src.iter().position(|&b| b == 0).unwrap_or(src.len());
    str::from_utf8_unchecked(&src[..len])
}

unsafe fn add_console(name: &str, manufacturer: &str, year: i32, 
                      cpu: &str, gpu: &str, units_sold: i32) {
    if CONSOLES_COUNT >= MAX_CONSOLES { 
        return; 
    }
    
    let c = &mut CONSOLES[CONSOLES_COUNT];
    c.id = NEXT_ID;
    NEXT_ID += 1;
    str_to_bytes(name, &mut c.name);
    str_to_bytes(manufacturer, &mut c.manufacturer);
    c.year = year;
    str_to_bytes(cpu, &mut c.cpu);
    str_to_bytes(gpu, &mut c.gpu);
    c.units_sold = units_sold;
    CONSOLES_COUNT += 1;
}

// ========== FUNÇÃO PRINCIPAL ==========
#[cfg_attr(feature = "wasm-bindgen", wasm_bindgen)]
pub fn start() {
    #[cfg(feature = "wasm-bindgen")]
    spawn_local(async {
        unsafe { run() };
    });
    
    #[cfg(not(feature = "wasm-bindgen"))]
    unsafe { run(); }
}

unsafe fn run() {
    // Converte a memória compartilhada
    let sab = std::slice::from_raw_parts_mut(
        memory as *mut AtomicU32,
        MEMORY_SIZE / 4
    );
    let data_area = memory.add(SAB_HEADER_SIZE);
    
    web_sys::console::log_1(&"🦀 run() iniciado".into());
    
    // Dados iniciais
    add_console("PlayStation 5", "Sony", 2020, "AMD Zen 2", "AMD RDNA 2", 59);
    add_console("Xbox Series X", "Microsoft", 2020, "AMD Zen 2", "AMD RDNA 2", 21);
    
    loop {
        while sab[0].load(Ordering::Acquire) == 0 {
            std::hint::spin_loop();
        }
        
        let op = sab[1].load(Ordering::SeqCst);
        let _id = sab[2].load(Ordering::SeqCst) as i32;
        let data_len = sab[3].load(Ordering::SeqCst) as usize;
        
        web_sys::console::log_3(
            &"📨 Comando: op=".into(),
            &op.into(),
            &format!(" data_len={}", data_len).into()
        );
        
        match op {
            1 => {
                if data_len > 0 && data_len <= MAX_DATA_SIZE {
                    let data_slice = std::slice::from_raw_parts(data_area, data_len);
                    if let Ok(data_str) = str::from_utf8(data_slice) {
                        let parts: Vec<&str> = data_str.split(',').collect();
                        
                        let name = if parts.len() > 0 { parts[0] } else { "New Console" };
                        let manufacturer = if parts.len() > 1 { parts[1] } else { "Unknown" };
                        let year = if parts.len() > 2 { parts[2].parse().unwrap_or(2024) } else { 2024 };
                        let cpu = if parts.len() > 3 { parts[3] } else { "CPU" };
                        let gpu = if parts.len() > 4 { parts[4] } else { "GPU" };
                        let units_sold = if parts.len() > 5 { parts[5].parse().unwrap_or(-1) } else { -1 };
                        
                        if CONSOLES_COUNT < MAX_CONSOLES {
                            add_console(name, manufacturer, year, cpu, gpu, units_sold);
                        }
                    }
                }
            },
            
            5 => {
                // LIST - só prepara resposta
            },
            
            _ => {}
        }
        
        // Prepara resposta (sempre a lista completa)
        let mut pos = 0;
        let out = std::slice::from_raw_parts_mut(data_area, MAX_DATA_SIZE);
        
        for i in 0..CONSOLES_COUNT {
            let c = &CONSOLES[i];
            let name = bytes_to_str(&c.name);
            let manufacturer = bytes_to_str(&c.manufacturer);
            let cpu = bytes_to_str(&c.cpu);
            let gpu = bytes_to_str(&c.gpu);
            
            let line = format!("{},{},{},{},{},{},{}\n", 
                c.id, name, manufacturer, c.year, cpu, gpu,
                if c.units_sold > 0 { c.units_sold.to_string() } else { "null".to_string() });
            
            let bytes = line.as_bytes();
            if pos + bytes.len() <= MAX_DATA_SIZE {
                out[pos..pos+bytes.len()].copy_from_slice(bytes);
                pos += bytes.len();
            }
        }
        
        sab[1].store(pos as u32, Ordering::Release);
        sab[0].store(2, Ordering::Release);
    }
}

// ========== PARTE GLUE (legacy/worker) ==========
#[cfg(feature = "wasm-bindgen")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Console {
    pub id: u32,
    pub name: String,
    pub manufacturer: String,
    pub year: u16,
    pub cpu: String,
    pub gpu: String,
    pub units_sold: Option<f32>,
}

#[cfg(feature = "wasm-bindgen")]
#[wasm_bindgen]
pub struct App;

#[cfg(feature = "wasm-bindgen")]
#[wasm_bindgen]
impl App {
    #[wasm_bindgen(constructor)]
    pub fn new() -> App {
        #[cfg(feature = "wasm-bindgen")]
        web_sys::console::log_1(&"🎮 App initialized (unified)".into());
        App
    }
    
    unsafe fn raw_to_console(raw: &RawConsole) -> Console {
        Console {
            id: raw.id as u32,
            name: bytes_to_str(&raw.name).to_string(),
            manufacturer: bytes_to_str(&raw.manufacturer).to_string(),
            year: raw.year as u16,
            cpu: bytes_to_str(&raw.cpu).to_string(),
            gpu: bytes_to_str(&raw.gpu).to_string(),
            units_sold: if raw.units_sold > 0 { Some(raw.units_sold as f32) } else { None },
        }
    }
    
    pub fn list(&self) -> Result<JsValue, JsValue> {
        unsafe {
            let mut consoles = Vec::with_capacity(CONSOLES_COUNT);
            for i in 0..CONSOLES_COUNT {
                consoles.push(Self::raw_to_console(&CONSOLES[i]));
            }
            
            let serializer = Serializer::new()
                .serialize_maps_as_objects(true);
            consoles.serialize(&serializer)
                .map_err(|e| JsValue::from_str(&e.to_string()))
        }
    }
    
    pub fn create(&mut self, name: String, manufacturer: String, year: u16,
                  cpu: String, gpu: String, units_sold: Option<f32>) -> Result<JsValue, JsValue> {
        unsafe {
            add_console(
                &name, 
                &manufacturer, 
                year as i32, 
                &cpu, 
                &gpu, 
                units_sold.map(|u| u as i32).unwrap_or(-1)
            );
            
            let console = Self::raw_to_console(&CONSOLES[CONSOLES_COUNT - 1]);
            
            let serializer = Serializer::new()
                .serialize_maps_as_objects(true);
            console.serialize(&serializer)
                .map_err(|e| JsValue::from_str(&e.to_string()))
        }
    }
    
    pub fn get(&self, id: u32) -> Result<JsValue, JsValue> {
        unsafe {
            for i in 0..CONSOLES_COUNT {
                if CONSOLES[i].id == id as i32 {
                    let console = Self::raw_to_console(&CONSOLES[i]);
                    let serializer = Serializer::new()
                        .serialize_maps_as_objects(true);
                    return console.serialize(&serializer)
                        .map_err(|e| JsValue::from_str(&e.to_string()));
                }
            }
        }
        Err(JsValue::from_str("Console not found"))
    }
    
    pub fn update(&mut self, id: u32, name: String, manufacturer: String, year: u16,
                  cpu: String, gpu: String, units_sold: Option<f32>) -> Result<JsValue, JsValue> {
        unsafe {
            for i in 0..CONSOLES_COUNT {
                if CONSOLES[i].id == id as i32 {
                    let c = &mut CONSOLES[i];
                    str_to_bytes(&name, &mut c.name);
                    str_to_bytes(&manufacturer, &mut c.manufacturer);
                    c.year = year as i32;
                    str_to_bytes(&cpu, &mut c.cpu);
                    str_to_bytes(&gpu, &mut c.gpu);
                    c.units_sold = units_sold.map(|u| u as i32).unwrap_or(-1);
                    
                    let console = Self::raw_to_console(c);
                    let serializer = Serializer::new()
                        .serialize_maps_as_objects(true);
                    return console.serialize(&serializer)
                        .map_err(|e| JsValue::from_str(&e.to_string()));
                }
            }
        }
        Err(JsValue::from_str("Console not found"))
    }
    
    pub fn delete(&mut self, id: u32) -> Result<JsValue, JsValue> {
        unsafe {
            for i in 0..CONSOLES_COUNT {
                if CONSOLES[i].id == id as i32 {
                    for j in i..CONSOLES_COUNT-1 {
                        CONSOLES[j] = CONSOLES[j+1];
                    }
                    CONSOLES_COUNT -= 1;
                    return Ok(JsValue::from_bool(true));
                }
            }
        }
        Ok(JsValue::from_bool(false))
    }
}
