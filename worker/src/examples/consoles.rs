use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_wasm_bindgen::Serializer;
use js_sys::{Int32Array, Uint8Array, ArrayBuffer, Atomics};

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

impl Console {
    pub fn new(
        name: String,
        manufacturer: String,
        year: u16,
        cpu: String,
        gpu: String,
        units_sold: Option<f32>,
    ) -> Self {
        Self {
            id: 0,
            name,
            manufacturer,
            year,
            cpu,
            gpu,
            units_sold,
        }
    }
    
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("Name cannot be empty".to_string());
        }
        if self.manufacturer.is_empty() {
            return Err("Manufacturer cannot be empty".to_string());
        }
        if self.year < 1970 || self.year > 2024 {
            return Err("Year must be between 1970 and 2024".to_string());
        }
        if self.cpu.is_empty() {
            return Err("CPU cannot be empty".to_string());
        }
        if self.gpu.is_empty() {
            return Err("GPU cannot be empty".to_string());
        }
        Ok(())
    }
}

#[wasm_bindgen]
pub struct App {
    consoles: Vec<Console>,
    next_id: u32,
}

#[wasm_bindgen]
impl App {
    #[wasm_bindgen(constructor)]
    pub fn new() -> App {
        web_sys::console::log_1(&"🎮 Console example initialized".into());
        
        let mut app = App {
            consoles: Vec::new(),
            next_id: 1,
        };
        
        app.seed();
        app
    }
    
    fn seed(&mut self) {
        let samples = vec![
            Console::new(
                "PlayStation 5".to_string(),
                "Sony".to_string(),
                2020,
                "AMD Zen 2".to_string(),
                "AMD RDNA 2".to_string(),
                Some(59.0),
            ),
            Console::new(
                "Xbox Series X".to_string(),
                "Microsoft".to_string(),
                2020,
                "AMD Zen 2".to_string(),
                "AMD RDNA 2".to_string(),
                Some(21.0),
            ),
        ];
        
        for mut console in samples {
            console.id = self.next_id;
            self.next_id += 1;
            self.consoles.push(console);
        }
    }
    
    fn to_js_value<T: Serialize>(&self, value: &T) -> Result<JsValue, JsValue> {
        let serializer = Serializer::new()
            .serialize_maps_as_objects(true)
            .serialize_large_number_types_as_bigints(true);
        
        value.serialize(&serializer)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
    
    pub fn create(&mut self, name: String, manufacturer: String, year: u16, cpu: String, gpu: String, units_sold: Option<f32>) -> Result<JsValue, JsValue> {
        let mut console = Console {
            id: 0,
            name,
            manufacturer,
            year,
            cpu,
            gpu,
            units_sold,
        };
        
        console.validate().map_err(|e| JsValue::from_str(&e))?;
        
        console.id = self.next_id;
        self.next_id += 1;
        
        let created = console.clone();
        self.consoles.push(console);
        
        let serializer = Serializer::new()
            .serialize_maps_as_objects(true)
            .serialize_large_number_types_as_bigints(true);
        
        created.serialize(&serializer)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
    
    pub fn list(&self) -> Result<JsValue, JsValue> {
        self.to_js_value(&self.consoles)
    }
    
    pub fn get(&self, id: u32) -> Result<JsValue, JsValue> {
        match self.consoles.iter().find(|c| c.id == id) {
            Some(console) => {
                let serializer = Serializer::new()
                    .serialize_maps_as_objects(true)
                    .serialize_large_number_types_as_bigints(true);
                
                console.serialize(&serializer)
                    .map_err(|e| JsValue::from_str(&e.to_string()))
            }
            None => Err(JsValue::from_str("Console not found")),
        }
    }
    
    pub fn update(&mut self, id: u32, name: String, manufacturer: String, year: u16, cpu: String, gpu: String, units_sold: Option<f32>) -> Result<JsValue, JsValue> {
        let updated = Console {
            id,
            name,
            manufacturer,
            year,
            cpu,
            gpu,
            units_sold,
        };
        
        updated.validate().map_err(|e| JsValue::from_str(&e))?;
        
        match self.consoles.iter_mut().find(|c| c.id == id) {
            Some(console) => {
                *console = updated.clone();
                
                let serializer = Serializer::new()
                    .serialize_maps_as_objects(true)
                    .serialize_large_number_types_as_bigints(true);
                
                console.serialize(&serializer)
                    .map_err(|e| JsValue::from_str(&e.to_string()))
            }
            None => Err(JsValue::from_str("Console not found")),
        }
    }
    
    pub fn delete(&mut self, id: u32) -> Result<JsValue, JsValue> {
        let len = self.consoles.len();
        self.consoles.retain(|c| c.id != id);
        
        if self.consoles.len() < len {
            Ok(JsValue::from_bool(true))
        } else {
            Err(JsValue::from_str("Console not found"))
        }
    }

    /// Processa comandos via SAB
    pub fn process_command(&mut self, view: &Int32Array) -> Result<(), JsValue> {
        // ========== PARTE 1: LEITURA ATÔMICA (UNSAFE) ==========
        let (op, id, data_len) = unsafe {
            let cmd = Atomics::load(view, 0)?;
            if cmd == 0 {
                return Ok(());
            }
            (
                Atomics::load(view, 1)?,
                Atomics::load(view, 2)? as u32,
                Atomics::load(view, 3)? as u32
            )
        };

        // ========== PARTE 2: PROCESSAMENTO (SEGURO) ==========
        let result = if data_len > 0 {
            let buffer = ArrayBuffer::from(view.buffer());
            let data_bytes = Uint8Array::new_with_byte_offset_and_length(
                &buffer.into(),
                16,
                data_len
            );
            
            let data_vec = data_bytes.to_vec();
            let data_str = String::from_utf8(data_vec).unwrap_or_default();
            
            if !data_str.is_empty() {
                js_sys::JSON::parse(&data_str).ok()
            } else {
                None
            }
        } else {
            None
        };

        let js_result = match op {
            1 => { // CREATE
                if let Some(data) = result {
                    let name = js_sys::Reflect::get(&data, &"name".into())?.as_string().unwrap_or_default();
                    let manufacturer = js_sys::Reflect::get(&data, &"manufacturer".into())?.as_string().unwrap_or_default();
                    let year = js_sys::Reflect::get(&data, &"year".into())?.as_f64().unwrap_or(0.0) as u16;
                    let cpu = js_sys::Reflect::get(&data, &"cpu".into())?.as_string().unwrap_or_default();
                    let gpu = js_sys::Reflect::get(&data, &"gpu".into())?.as_string().unwrap_or_default();
                    let units_sold = js_sys::Reflect::get(&data, &"units_sold".into())?.as_f64().map(|v| v as f32);
                    
                    self.create(name, manufacturer, year, cpu, gpu, units_sold)
                } else {
                    Err(JsValue::from_str("Missing data for CREATE"))
                }
            },
            2 => self.get(id),
            3 => { // UPDATE
                if let Some(data) = result {
                    let name = js_sys::Reflect::get(&data, &"name".into())?.as_string().unwrap_or_default();
                    let manufacturer = js_sys::Reflect::get(&data, &"manufacturer".into())?.as_string().unwrap_or_default();
                    let year = js_sys::Reflect::get(&data, &"year".into())?.as_f64().unwrap_or(0.0) as u16;
                    let cpu = js_sys::Reflect::get(&data, &"cpu".into())?.as_string().unwrap_or_default();
                    let gpu = js_sys::Reflect::get(&data, &"gpu".into())?.as_string().unwrap_or_default();
                    let units_sold = js_sys::Reflect::get(&data, &"units_sold".into())?.as_f64().map(|v| v as f32);
                    
                    self.update(id, name, manufacturer, year, cpu, gpu, units_sold)
                } else {
                    Err(JsValue::from_str("Missing data for UPDATE"))
                }
            },
            4 => self.delete(id),
            5 => self.list(),
            _ => Err(JsValue::from_str("Unknown operation")),
        };

        // ========== PARTE 3: ESCRITA ATÔMICA (UNSAFE) ==========
        unsafe {
            match js_result {
                Ok(val) => {
                    let json = js_sys::JSON::stringify(&val)?;
                    let result_str = json.as_string().unwrap_or_default();
                    let result_bytes = result_str.into_bytes();
                    
                    Atomics::store(view, 0, 2)?;
                    Atomics::store(view, 1, result_bytes.len() as i32)?;
                    
                    let buffer = ArrayBuffer::from(view.buffer());
                    let result_view = Uint8Array::new_with_byte_offset_and_length(
                        &buffer.into(),
                        16,
                        result_bytes.len() as u32
                    );
                    result_view.copy_from(&result_bytes);
                },
                Err(e) => {
                    let error_str = e.as_string().unwrap_or("Unknown error".to_string());
                    let error_bytes = error_str.into_bytes();
                    
                    Atomics::store(view, 0, 2)?;
                    Atomics::store(view, 1, error_bytes.len() as i32)?;
                    
                    let buffer = ArrayBuffer::from(view.buffer());
                    let error_view = Uint8Array::new_with_byte_offset_and_length(
                        &buffer.into(),
                        16,
                        error_bytes.len() as u32
                    );
                    error_view.copy_from(&error_bytes);
                }
            }

            Atomics::notify(view, 0, 1)?;
        }

        Ok(())
    }
}
