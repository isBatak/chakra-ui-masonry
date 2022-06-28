import { Container, chakra } from '@chakra-ui/react';
import { Masonry } from '@isBatak/chakra-ui-masonry';

const heights = [150, 30, 90, 70, 90, 100, 150, 30, 50, 80];
const colors = ['one', 'two', 'three', 'one', 'two', 'three', 'three', 'one', 'three', 'one'];

const Item = chakra('div', {
	baseStyle: {
		textAlign: 'center',
		borderRadius: 'md',
	},
});

const Index = () => (
	<Container w="full" maxW="container.lg" mx="auto">
		<Masonry columns={4} spacing={{ base: 1, sm: 2, md: 3 }} defaultHeight={450} defaultColumns={4} defaultSpacing={1}>
			{heights.map((height, index) => (
				<Item key={index} h={height} bg={colors[index]} />
			))}
		</Masonry>
	</Container>
);

export default Index;
