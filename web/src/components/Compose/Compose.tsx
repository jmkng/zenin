interface Props {
    providers: Array<React.JSXElementConstructor<React.PropsWithChildren<unknown>>>
    children?: React.ReactNode
}

export default function Compose(props: Props) {
    const { providers = [], children } = props

    return (
        <>
            {providers.reduceRight((acc, Comp) => {
                return <Comp>{acc}</Comp>
            }, children)}
        </>
    )
}
