import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartIdx = cart.findIndex(item => item.id === productId);

      if(cartIdx === -1) {
        const newProduct = await api.get(`/products/${productId}`).then(response => {
          return response.data;
        });

        const newCart = [...cart, { ...newProduct, amount: 1 }];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        setCart(newCart);
      } else {
        const stock = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);

        if(stock.amount === cart[cartIdx].amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        let newList = [...cart];  
        newList[cartIdx].amount += 1;

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newList));

        setCart(newList);
      }
    } catch {
      toast.error('Erro na adição do produto');
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartIdx = cart.findIndex(item => item.id === productId);

      if(cartIdx === -1) {
        throw new Error();
      } else {
        let newList = [...cart];  

        newList.splice(cartIdx, 1);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newList));

        setCart(newList);
      }
    } catch {
      toast.error('Erro na remoção do produto');
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = await api.get<Stock>(`/stock/${productId}`).then(response => { return response.data });
      const newCart = [...cart];

      const cartIdx = newCart.findIndex(item => item.id === productId);

      if(amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(!amount)
        return;

      newCart[cartIdx].amount = amount;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
