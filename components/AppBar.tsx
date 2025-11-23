import * as React from 'react';
import { Appbar } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


interface AppBarProps {
    navigation: any;
    route: any;
    back?: any;
}

const AppBar: React.FC<AppBarProps> = ({ navigation, route, back }) => {
    return (
        <Appbar.Header>
            <Appbar.Action
                icon={({ color, size }) => (
                    <MaterialCommunityIcons name="home-outline" color={color} size={size} />
                )}
                onPress={() => navigation.navigate('Past Reads')}
            />
            {back && <Appbar.BackAction onPress={navigation.goBack} />}
            <Appbar.Content
                title="BookShelf"
                titleStyle={{
                    fontSize: 20,
                    fontWeight: 'bold',
                }} />
            <Appbar.Action
                icon={({ color, size }) => (
                    <MaterialCommunityIcons name="book-check-outline" color={color} size={size} />
                )}
                onPress={() => navigation.navigate('Past Reads')}
            />
            <Appbar.Action
                icon={({ color, size }) => (
                    <MaterialCommunityIcons name="bookshelf" color={color} size={size} />
                )}
                onPress={() => navigation.navigate('Books')}
            />
        </Appbar.Header>
    );
};

export default AppBar;
