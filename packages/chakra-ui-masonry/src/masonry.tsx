import { chakra, ResponsiveValue, SystemProps, useMergeRefs, forwardRef, useTheme } from '@chakra-ui/react';
import { useRef, useEffect, useState, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { parseToNumber } from './use-masonry';

export interface IMasonryProps {
	/**
	 * The content of the component.
	 */
	children: NonNullable<ReactNode>;
	/**
	 * Number of columns.
	 * @default 4
	 */
	columns?: ResponsiveValue<number | string>;
	/**
	 * The default number of columns of the component. This is provided for server-side rendering.
	 */
	defaultColumns?: number;
	/**
	 * The default height of the component in px. This is provided for server-side rendering.
	 */
	defaultHeight?: number;
	/**
	 * The default spacing of the component. Like `spacing`, it is a factor of the theme's spacing.
	 * This is provided for server-side rendering.
	 */
	defaultSpacing?: number;
	/**
	 * Defines the space between children. It is a factor of the theme's spacing.
	 * @default 1
	 */
	spacing?: SystemProps['margin'];
}

export const Masonry = forwardRef<IMasonryProps, 'div'>((props, ref) => {
	const {
		children,
		className,
		columns = 4,
		spacing = 1,
		defaultColumns,
		defaultHeight,
		defaultSpacing,
		...rest
	} = props;

	const masonryRef = useRef<HTMLDivElement>();
	const [maxColumnHeight, setMaxColumnHeight] = useState();

	const isSSR = !maxColumnHeight && defaultHeight && defaultColumns !== undefined && defaultSpacing !== undefined;

	const [numberOfLineBreaks, setNumberOfLineBreaks] = useState(isSSR ? defaultColumns - 1 : 0);

	const ownerState = {
		...props,
		spacing,
		columns,
		maxColumnHeight,
		defaultColumns,
		defaultHeight,
		defaultSpacing,
		isSSR,
	};

	const handleResize = (masonryChildren) => {
		if (!masonryRef.current || !masonryChildren || masonryChildren.length === 0) {
			return;
		}
		const masonry = masonryRef.current;
		const masonryFirstChild = masonryRef.current.firstChild;
		const parentWidth = masonry.clientWidth;
		const firstChildWidth = masonryFirstChild.clientWidth;

		if (parentWidth === 0 || firstChildWidth === 0) {
			return;
		}

		const firstChildComputedStyle = window.getComputedStyle(masonryFirstChild);
		const firstChildMarginLeft = parseToNumber(firstChildComputedStyle.marginLeft);
		const firstChildMarginRight = parseToNumber(firstChildComputedStyle.marginRight);

		const currentNumberOfColumns = Math.round(
			parentWidth / (firstChildWidth + firstChildMarginLeft + firstChildMarginRight)
		);

		const columnHeights = new Array(currentNumberOfColumns).fill(0);
		let skip = false;

		masonry.childNodes.forEach((child) => {
			if (child.nodeType !== Node.ELEMENT_NODE || child.dataset.class === 'line-break' || skip) {
				return;
			}
			const childComputedStyle = window.getComputedStyle(child);
			const childMarginTop = parseToNumber(childComputedStyle.marginTop);
			const childMarginBottom = parseToNumber(childComputedStyle.marginBottom);
			// if any one of children isn't rendered yet, masonry's height shouldn't be computed yet
			const childHeight = parseToNumber(childComputedStyle.height)
				? Math.ceil(parseToNumber(childComputedStyle.height)) + childMarginTop + childMarginBottom
				: 0;
			if (childHeight === 0) {
				skip = true;
				return;
			}
			// if there is a nested image that isn't rendered yet, masonry's height shouldn't be computed yet
			for (let i = 0; i < child.childNodes.length; i += 1) {
				const nestedChild = child.childNodes[i];
				if (nestedChild.tagName === 'IMG' && nestedChild.clientHeight === 0) {
					skip = true;
					break;
				}
			}
			if (!skip) {
				// find the current shortest column (where the current item will be placed)
				const currentMinColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
				columnHeights[currentMinColumnIndex] += childHeight;
				const order = currentMinColumnIndex + 1;
				child.style.order = order;
			}
		});

		if (!skip) {
			// In React 18, state updates in a ResizeObserver's callback are happening after the paint which causes flickering
			// when doing some visual updates in it. Using flushSync ensures that the dom will be painted after the states updates happen
			// Related issue - https://github.com/facebook/react/issues/24331
			flushSync(() => {
				setMaxColumnHeight(Math.max(...columnHeights));
				setNumberOfLineBreaks(currentNumberOfColumns > 0 ? currentNumberOfColumns - 1 : 0);
			});
		}
	};

	const observer = useRef(typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(handleResize));

	useEffect(() => {
		const resizeObserver = observer.current;
		// IE and old browsers are not supported
		if (resizeObserver === undefined) {
			return undefined;
		}

		if (masonryRef.current) {
			masonryRef.current.childNodes.forEach((childNode) => {
				resizeObserver.observe(childNode);
			});
		}
		return () => (resizeObserver ? resizeObserver.disconnect() : {});
	}, [columns, spacing, children]);

	const lineBreakStyle = {
		flexBasis: '100%',
		width: 0,
		margin: 0,
		padding: 0,
	};

	//  columns are likely to have different heights and hence can start to merge;
	//  a line break at the end of each column prevents columns from merging
	const lineBreaks = new Array(numberOfLineBreaks)
		.fill('')
		.map((_, index) => <span key={index} data-class="line-break" style={{ ...lineBreakStyle, order: index + 1 }} />);

	const theme = useTheme();

	// const { styles } = useMasonry({ props, isSSR, theme });

	return (
		<chakra.div
			ref={useMergeRefs(ref, masonryRef)}
			__css={{
				margin: '-12px',
				height: '410px',
				width: '100%',
				display: 'flex',
				flexFlow: 'column wrap',
				alignContent: 'space-between',
				boxSizing: 'border-box',
				'& > *': {
					margin: '12px',
					width: 'calc(25% - 16px)',
				},
			}}
		>
			{children}
			{lineBreaks}
		</chakra.div>
	);
});
