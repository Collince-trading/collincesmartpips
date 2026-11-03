import { observer } from 'mobx-react-lite';
import { useTranslations } from '@deriv-com/translations';
import { MenuItem, Text } from '@deriv-com/ui';

export const MenuItems = observer(() => {
    const { localize } = useTranslations();

    return (
        <MenuItem as='a' className='app-header__menu' href='/free-bot.html'>
            <Text>{localize('Free Bot')}</Text>
        </MenuItem>
    );
});

export const TradershubLink = observer(() => null);

type MenuItemsType = typeof MenuItems & {
    TradershubLink: typeof TradershubLink;
};

(MenuItems as MenuItemsType).TradershubLink = TradershubLink;

export default MenuItems as MenuItemsType;
