use js_sys::{SharedArrayBuffer};
use std::collections::HashMap;

// Traço que qualquer modelo precisa implementar
pub trait Model {
    fn id(&self) -> u32;
    fn set_id(&mut self, id: u32);
    fn validate(&self) -> Result<(), String>;
}

pub trait Store: Send {
    fn create(&mut self, bytes: &[u8]) -> Vec<u8>;
    fn read(&self, id: u32) -> Vec<u8>;
    fn update(&mut self, id: u32, bytes: &[u8]) -> Vec<u8>;
    fn delete(&mut self, id: u32) -> Vec<u8>;
    fn list(&self) -> Vec<u8>;
}

#[allow(unused)]
pub struct ModelStore<T: Model> {
    items: Vec<T>,
}

impl<T: Model> ModelStore<T> {
    pub fn new() -> Self {
        Self {
            items: Vec::new(),
        }
    }
}

impl<T: Model + Send + 'static> Store for ModelStore<T> {
    fn create(&mut self, _bytes: &[u8]) -> Vec<u8> {
        Vec::new() // Placeholder
    }
    
    fn read(&self, _id: u32) -> Vec<u8> {
        Vec::new() // Placeholder
    }
    
    fn update(&mut self, _id: u32, _bytes: &[u8]) -> Vec<u8> {
        Vec::new() // Placeholder
    }
    
    fn delete(&mut self, _id: u32) -> Vec<u8> {
        Vec::new() // Placeholder
    }
    
    fn list(&self) -> Vec<u8> {
        Vec::new() // Placeholder
    }
}

pub struct Runtime {
    stores: HashMap<String, Box<dyn Store>>,
    sab: Option<SharedArrayBuffer>,
}

impl Runtime {
    pub fn new() -> Self {
        Self {
            stores: HashMap::new(),
            sab: None,
        }
    }
    
    pub fn register_store<T: Model + Send + 'static>(&mut self, name: &str) {
        let store = ModelStore::<T>::new();
        self.stores.insert(name.to_string(), Box::new(store));
    }
    
    pub fn set_sab(&mut self, sab: SharedArrayBuffer) {
        self.sab = Some(sab);
    }
    
    pub fn process_command(&mut self, store_name: &str, op: u8, id: u32, data: &[u8]) -> Vec<u8> {
        match self.stores.get_mut(store_name) {
            Some(store) => {
                match op {
                    1 => store.create(data),
                    2 => store.read(id),
                    3 => store.update(id, data),
                    4 => store.delete(id),
                    5 => store.list(),
                    _ => b"UNKNOWN_OP".to_vec(),
                }
            }
            None => format!("STORE_NOT_FOUND:{}", store_name).into_bytes(),
        }
    }
}
